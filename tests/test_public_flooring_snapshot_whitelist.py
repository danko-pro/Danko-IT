from __future__ import annotations

import json
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import Settings, load_settings
from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.flooring_package_projection import build_flooring_package_projection
from supply_bot.estimates.application.flooring_snapshot import (
    DEFAULT_PUBLIC_FLOORING_SNAPSHOT,
    EXPECTED_COVERING_CODES,
    EXPECTED_LAYOUT_CODES,
    EXPECTED_PLINTH_CODES,
    EXPECTED_PREPARATION_CODES,
    PUBLIC_FLOORING_FORBIDDEN_KEYS,
    BuildFlooringSnapshotUseCase,
    _aggregate_covering_consumables,
    _publish_package_backed_snapshot_row,
    _resolve_public_code,
    build_flooring_v2_local_package_seed,
    build_public_flooring_snapshot,
    build_public_flooring_snapshot_from_catalog,
    covering_spec_lines_are_complete,
)
from supply_bot.estimates.application.migrate_flooring_synthetic_assemblies import (
    MigrateGlobalFlooringSyntheticAssembliesUseCase,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository
from tests.admin_projects_routes_case import AdminProjectsRouteCase

_FLOORING_SNAPSHOT_PATH = (
    Path(__file__).resolve().parents[1]
    / "admin-ui"
    / "src"
    / "features"
    / "public"
    / "generated"
    / "flooring.snapshot.json"
)


def _walk_keys(node: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(node, dict):
        for key, value in node.items():
            found.add(str(key))
            found |= _walk_keys(value)
    elif isinstance(node, (list, tuple)):
        for item in node:
            found |= _walk_keys(item)
    return found


def _minimal_covering_kwargs(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "title": "Ламинат",
        "material_price_per_m2": 930,
        "labor_price_per_m2": 1000,
        "base_waste_percent": 10,
        "underlay_mode": "required",
        "underlay_consumption_per_m2": 1,
        "glue_consumption_per_m2": 0,
        "glue_unit": "кг",
        "glue_price_per_unit": 0,
        "primer_consumption_per_m2": 0.1,
        "primer_unit": "л",
        "primer_price_per_unit": 250,
        "svp_consumption_per_m2": 0,
        "svp_unit": "шт",
        "svp_price_per_unit": 0,
        "grout_consumption_per_m2": 0,
        "grout_unit": "кг",
        "grout_price_per_unit": 0,
        "custom_consumables_json": "[]",
        "needs_plinth": True,
        "instrument_price_per_m2": 40,
    }
    values.update(overrides)
    return values


def _sample_assembly_row(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Porcelain tile",
        "unit": "m2",
        "price": 2900,
        "consumption_per_m2": 1,
        "package_size": None,
        "layer_mm": None,
        "is_enabled": True,
        "public_category": "materials",
        "public_title": "Public tile title",
        "id": 99,
        "assembly_item_id": 88,
        "note": "internal",
    }
    values.update(overrides)
    return values


def _work_assembly_row(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "section": "work",
        "kind": "work",
        "formula": "flat_per_m2",
        "title": "Floor work",
        "public_category": "works",
    }
    values.update(overrides)
    return _sample_assembly_row(**values)


class FlooringSnapshotProcurementFieldsTests(unittest.TestCase):
    def test_projection_spec_lines_allow_procurement_keys(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                _sample_assembly_row(
                    section="consumable",
                    kind="consumable",
                    formula="kg_layer_consumption",
                    title="Клей",
                    unit="kg",
                    price=600,
                    package_size=25,
                    consumption_per_m2=1.5,
                    layer_mm=5,
                    public_category="consumables",
                )
            ],
        )
        line = projection["specLines"][0]
        allowed = {
            "code",
            "title",
            "category",
            "basis",
            "unit",
            "quantityPerBasis",
            "unitPrice",
            "packageSize",
            "packageUnit",
            "packagePrice",
            "purchaseMode",
            "purchaseAggregation",
            "aggregationKey",
            "calculationNote",
        }
        self.assertTrue(set(line) <= allowed)
        leaked = set(line) & PUBLIC_FLOORING_FORBIDDEN_KEYS
        self.assertEqual(leaked, set())


class FlooringSnapshotSpecLinesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_row_without_assembly_is_omitted_from_snapshot(self) -> None:
        await self.repository.create_estimate_flooring_covering(**_minimal_covering_kwargs(title="Ламинат"))
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])

    async def test_preparation_without_assembly_is_omitted_from_snapshot(self) -> None:
        await self.repository.create_estimate_flooring_preparation(
            title="Грунтование",
            labor_price_per_m2=250,
            material_price_per_m2=120,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["preparations"], [])

    async def test_covering_with_global_assembly_has_spec_lines(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Ламинат", material_price_per_m2=930)
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Laminate package",
            [
                _sample_assembly_row(title="Laminate board", public_title="Ламинат доска"),
                _sample_assembly_row(
                    section="consumable",
                    kind="consumable",
                    formula="unit_consumption",
                    title="Underlay",
                    public_title="Underlay",
                    unit="m2",
                    price=220,
                    consumption_per_m2=1,
                    public_category="consumables",
                ),
                _sample_assembly_row(
                    section="consumable",
                    kind="consumable",
                    formula="unit_consumption",
                    title="Грунт",
                    public_title="Грунт",
                    unit="l",
                    price=250,
                    consumption_per_m2=0.1,
                    public_category="consumables",
                ),
                _sample_assembly_row(
                    section="tool",
                    kind="tool",
                    formula="flat_per_m2",
                    title="Tool consumables",
                    public_title="Tool consumables",
                    unit="m2",
                    price=40,
                    consumption_per_m2=1,
                    public_category="tools",
                ),
            ],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertIn("specLines", laminate)
        self.assertEqual(len(laminate["specLines"]), 4)
        self.assertEqual(laminate["specLines"][0]["title"], "Ламинат доска")
        self.assertEqual(laminate["materialPricePerM2"], 930)

    async def test_partial_covering_assembly_is_omitted_from_snapshot(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Ламинат", material_price_per_m2=930)
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Partial laminate package",
            [_sample_assembly_row(title="Laminate board only", public_title="Ламинат доска")],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])

    def test_covering_spec_lines_completeness_guard(self) -> None:
        flat_rates = {
            "materialPricePerM2": 930,
            "underlayPricePerM2": 220,
            "adhesivePricePerM2": 0,
            "primerPricePerM2": 25,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 40,
        }
        complete_lines = [
            {"category": "materials", "title": "Board"},
            {"category": "consumables", "title": "Подложка"},
            {"category": "consumables", "title": "Грунт"},
            {"category": "tools", "title": "Инструмент"},
        ]
        partial_lines = [{"category": "materials", "title": "Board"}]

        self.assertTrue(covering_spec_lines_are_complete(flat_rates, complete_lines))
        self.assertFalse(covering_spec_lines_are_complete(flat_rates, partial_lines))

    def test_partial_covering_publish_gate_returns_none(self) -> None:
        flat_row = {
            "code": "laminate",
            "title": "Ламинат",
            "materialPricePerM2": 930,
            "underlayPricePerM2": 220,
            "adhesivePricePerM2": 0,
            "primerPricePerM2": 25,
            "svpPricePerM2": 0,
            "groutPricePerM2": 0,
            "toolConsumablesPerM2": 40,
        }
        published = _publish_package_backed_snapshot_row(
            flat_row,
            target_kind="covering",
            assembly={"rows": [_sample_assembly_row(title="Material only", public_title="Ламинат доска")]},
        )
        self.assertIsNone(published)

    async def test_preparation_and_layout_work_spec_lines(self) -> None:
        preparation_id = await self.repository.create_estimate_flooring_preparation(
            title="Грунтование",
            labor_price_per_m2=250,
            material_price_per_m2=120,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        )
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="Прямая",
            labor_price_per_m2=1000,
            labor_multiplier=1.1,
            extra_waste_percent=5,
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "preparation",
            preparation_id,
            "Primer package",
            [_work_assembly_row(title="Prime floor", public_title="Грунт пола", price=250, consumption_per_m2=1)],
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "layout",
            layout_id,
            "Straight layout package",
            [_work_assembly_row(title="Lay straight", public_title="Укладка прямая", price=1000, consumption_per_m2=1.1)],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        primer = next(item for item in payload["preparations"] if item["code"] == "primer")
        straight = next(item for item in payload["layouts"] if item["code"] == "straight")
        self.assertEqual(primer["specLines"][0]["category"], "works")
        self.assertEqual(straight["specLines"][0]["title"], "Укладка прямая")

    async def test_spec_lines_contain_no_forbidden_keys(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_minimal_covering_kwargs(title="Ламинат"))
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Package",
            [_sample_assembly_row()],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        leaked = _walk_keys(payload) & PUBLIC_FLOORING_FORBIDDEN_KEYS
        self.assertEqual(leaked, set())

    async def test_owner_assembly_ignored_in_public_snapshot(self) -> None:
        owner_repo = self.repository.for_owner(42)
        owner_covering_id = await owner_repo.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Ламинат", material_price_per_m2=9999)
        )
        await owner_repo.replace_estimate_flooring_catalog_assembly(
            "covering",
            owner_covering_id,
            "Owner package",
            [_sample_assembly_row(title="Owner-only line")],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])

    async def test_invalid_assembly_is_not_published(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_minimal_covering_kwargs(title="Ламинат"))
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Invalid package",
            [_sample_assembly_row(kind="work", section="work", public_category="works")],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])

    async def test_numeric_unit_assembly_is_not_published(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_minimal_covering_kwargs(title="Ламинат"))
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Invalid unit package",
            [_sample_assembly_row(title="Primer", public_title="Грунт", unit="0,08")],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])

    async def test_zero_price_layout_work_is_not_published(self) -> None:
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="Прямой",
            labor_price_per_m2=0,
            labor_multiplier=1.1,
            extra_waste_percent=5,
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "layout",
            layout_id,
            "Zero layout package",
            [_work_assembly_row(title="Straight", public_title="Прямой", price=0, consumption_per_m2=1.1)],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["layouts"], [])

    async def test_layout_without_assembly_is_omitted_from_snapshot(self) -> None:
        await self.repository.create_estimate_flooring_layout(
            title="Крупный формат",
            labor_price_per_m2=2000,
            labor_multiplier=1.2,
            extra_waste_percent=10,
        )
        await self.repository.create_estimate_flooring_layout(
            title="Клеевая",
            labor_price_per_m2=800,
            labor_multiplier=1.25,
            extra_waste_percent=5,
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["layouts"], [])

    async def test_layout_with_invalid_assembly_is_omitted(self) -> None:
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="Клеевая",
            labor_price_per_m2=800,
            labor_multiplier=1.25,
            extra_waste_percent=5,
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "layout",
            layout_id,
            "Invalid layout package",
            [_sample_assembly_row(kind="material", section="covering", public_category="materials")],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["layouts"], [])

    async def test_layout_default_labor_fallback_does_not_publish_without_package(self) -> None:
        await self.repository.create_estimate_flooring_layout(
            title="Клеевая",
            labor_price_per_m2=0,
            labor_multiplier=1.25,
            extra_waste_percent=5,
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["layouts"], [])
        self.assertNotIn(
            "glue",
            {item["code"] for item in payload["layouts"]},
        )

    def test_legacy_attach_spec_lines_helper_does_not_gate_publication(self) -> None:
        from supply_bot.estimates.application.flooring_snapshot import _attach_spec_lines_to_snapshot_row

        flat_row = {
            "code": "glue",
            "title": "Клеевая",
            "laborPricePerM2": 800,
            "laborFactor": 1.25,
            "additionalWastePercent": 5,
        }
        attached = _attach_spec_lines_to_snapshot_row(flat_row, target_kind="layout", assembly=None)
        self.assertNotIn("specLines", attached)
        self.assertEqual(attached, flat_row)

    def test_empty_assembly_rows_are_not_published(self) -> None:
        published = _publish_package_backed_snapshot_row(
            {"code": "laminate", "title": "Ламинат", "materialPricePerM2": 930},
            target_kind="covering",
            assembly={"rows": []},
        )
        self.assertIsNone(published)

    def test_shell_assembly_with_disabled_rows_is_not_published(self) -> None:
        published = _publish_package_backed_snapshot_row(
            {"code": "laminate", "title": "Ламинат", "materialPricePerM2": 930},
            target_kind="covering",
            assembly={"rows": [_sample_assembly_row(is_enabled=False)]},
        )
        self.assertIsNone(published)


class FlooringSnapshotAggregationTests(unittest.TestCase):
    def test_consumable_aggregation_formula(self) -> None:
        row = {
            "underlay_mode": "required",
            "underlay_consumption_per_m2": 1,
            "glue_consumption_per_m2": 1.5,
            "glue_price_per_unit": 300,
            "primer_consumption_per_m2": 0.2,
            "primer_price_per_unit": 125,
            "svp_consumption_per_m2": 4,
            "svp_price_per_unit": 30,
            "grout_consumption_per_m2": 0.5,
            "grout_price_per_unit": 180,
            "instrument_price_per_m2": 40,
            "custom_consumables_json": json.dumps(
                [{"title": "Прокладка", "consumption_per_m2": 0.1, "unit": "pcs", "price_per_unit": 50}]
            ),
        }
        rates = _aggregate_covering_consumables(row, underlay_price_per_m2=220)

        self.assertEqual(rates["underlayPricePerM2"], 220)
        self.assertEqual(rates["adhesivePricePerM2"], 450)
        self.assertEqual(rates["primerPricePerM2"], 25)
        self.assertEqual(rates["svpPricePerM2"], 120)
        self.assertEqual(rates["groutPricePerM2"], 90)
        self.assertEqual(rates["toolConsumablesPerM2"], 45)

    def test_custom_title_gets_stable_public_code(self) -> None:
        code_first = _resolve_public_code(
            "Паркет ручной работы",
            section="coverings",
            known_titles={},
            used_codes=set(),
        )
        code_second = _resolve_public_code(
            "Паркет ручной работы",
            section="coverings",
            known_titles={},
            used_codes=set(),
        )
        self.assertEqual(code_first, code_second)
        self.assertTrue(code_first.startswith("parket_") or code_first.startswith("custom_"))


async def _seed_f1_complete_global_catalog(repo: SqlAlchemyEstimateRuntimeRepository) -> None:
    for title in ("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска"):
        await repo.create_estimate_flooring_covering(**_minimal_covering_kwargs(title=title, underlay_mode="none"))
    for title, labor, material in (
        ("Без подготовки", 300, 100),
        ("Грунтование", 250, 120),
        ("Наливной пол", 650, 120),
        ("Гидроизоляция", 300, 80),
    ):
        await repo.create_estimate_flooring_preparation(
            title=title,
            labor_price_per_m2=labor,
            material_price_per_m2=material,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        )
    for title, labor, factor, waste in (
        ("Прямая", 1000, 1.1, 5),
        ("Крупный формат", 2000, 1.2, 10),
        ("Клеевая", 800, 1.25, 5),
        ("Плавающая", 1000, 1.0, 3),
    ):
        await repo.create_estimate_flooring_layout(
            title=title,
            labor_price_per_m2=labor,
            labor_multiplier=factor,
            extra_waste_percent=waste,
        )
    await MigrateGlobalFlooringSyntheticAssembliesUseCase(repo).execute()


class FlooringSnapshotRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_empty_global_catalog_returns_empty_package_first_catalog(self) -> None:
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload, build_public_flooring_snapshot())
        self.assertEqual(payload["coverings"], [])
        self.assertEqual(payload["preparations"], [])
        self.assertEqual(payload["layouts"], [])
        self.assertEqual(payload["plinthTypes"], DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"])
        self.assertEqual(payload["globalAddons"], DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"])

    async def test_all_published_layouts_include_spec_lines_for_known_codes(self) -> None:
        await _seed_f1_complete_global_catalog(self.repository)
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        for code in ("straight", "large_format_straight", "glue", "floating"):
            layout = next(item for item in payload["layouts"] if item["code"] == code)
            self.assertIn("specLines", layout)
            self.assertGreater(len(layout["specLines"]), 0)

    async def test_partial_layout_assemblies_publish_only_package_backed_rows(self) -> None:
        straight_id = await self.repository.create_estimate_flooring_layout(
            title="Прямая",
            labor_price_per_m2=1000,
            labor_multiplier=1.1,
            extra_waste_percent=5,
        )
        await self.repository.create_estimate_flooring_layout(
            title="Крупный формат",
            labor_price_per_m2=2000,
            labor_multiplier=1.2,
            extra_waste_percent=10,
        )
        await self.repository.create_estimate_flooring_layout(
            title="Клеевая",
            labor_price_per_m2=800,
            labor_multiplier=1.25,
            extra_waste_percent=5,
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "layout",
            straight_id,
            "Straight only",
            [_work_assembly_row(title="Lay straight", public_title="Укладка прямая", price=1000, consumption_per_m2=1.1)],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual({item["code"] for item in payload["layouts"]}, {"straight"})
        self.assertIn("specLines", payload["layouts"][0])

    async def test_known_global_rows_with_synthetic_assemblies_are_published(self) -> None:
        await _seed_f1_complete_global_catalog(self.repository)
        coverings = await self.repository.list_estimate_flooring_coverings()
        laminate_row = next(item for item in coverings if item["title"] == "Ламинат")
        layouts = await self.repository.list_estimate_flooring_layouts()
        straight_layout = next(item for item in layouts if item["title"] == "Прямая")
        async with self.repository._session_factory() as session:
            from sqlalchemy import update

            from supply_bot.storage_estimates.tables import estimate_flooring_coverings, estimate_flooring_layouts

            await session.execute(
                update(estimate_flooring_coverings)
                .where(estimate_flooring_coverings.c.id == laminate_row["id"])
                .values(material_price_per_m2=1111, labor_price_per_m2=2222, underlay_mode="none")
            )
            await session.execute(
                update(estimate_flooring_layouts)
                .where(estimate_flooring_layouts.c.id == straight_layout["id"])
                .values(labor_price_per_m2=1234)
            )
            await session.commit()

        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertEqual(laminate["materialPricePerM2"], 1111)
        self.assertNotIn("laborPricePerM2", laminate)
        self.assertEqual(laminate["underlayPricePerM2"], 0)
        self.assertIn("specLines", laminate)
        straight = next(item for item in payload["layouts"] if item["code"] == "straight")
        self.assertEqual(straight["laborPricePerM2"], 1234)
        self.assertIn("specLines", straight)
        self.assertEqual({item["code"] for item in payload["coverings"]}, EXPECTED_COVERING_CODES)

    async def test_custom_global_row_without_assembly_is_not_published(self) -> None:
        await self.repository.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Паркет ручной работы", material_price_per_m2=7777)
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual([item for item in payload["coverings"] if item["code"] not in EXPECTED_COVERING_CODES], [])

    async def test_custom_global_row_with_valid_assembly_is_published(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Паркет ручной работы", material_price_per_m2=7777, underlay_mode="none")
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Custom parquet package",
            [
                _sample_assembly_row(title="Parquet board", public_title="Паркет"),
                _sample_assembly_row(
                    section="consumable",
                    kind="consumable",
                    formula="unit_consumption",
                    title="Грунт",
                    public_title="Грунт",
                    unit="l",
                    price=250,
                    consumption_per_m2=0.1,
                    public_category="consumables",
                ),
                _sample_assembly_row(
                    section="tool",
                    kind="tool",
                    formula="flat_per_m2",
                    title="Tool consumables",
                    public_title="Tool consumables",
                    unit="m2",
                    price=40,
                    consumption_per_m2=1,
                    public_category="tools",
                ),
            ],
        )
        first = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        second = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        custom_rows = [item for item in first["coverings"] if item["code"] not in EXPECTED_COVERING_CODES]
        self.assertEqual(len(custom_rows), 1)
        self.assertEqual(custom_rows[0]["materialPricePerM2"], 7777)
        self.assertIn("specLines", custom_rows[0])
        self.assertEqual(
            [item for item in second["coverings"] if item["code"] not in EXPECTED_COVERING_CODES][0]["code"],
            custom_rows[0]["code"],
        )

    async def test_owner_scoped_rows_are_ignored_for_public_snapshot(self) -> None:
        owner_repo = self.repository.for_owner(42)
        await owner_repo.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Ламинат", material_price_per_m2=9999)
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload["coverings"], [])


class PublicFlooringSnapshotWhitelistTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-public-snapshot-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def test_public_snapshot_is_open_and_whitelisted(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                response = client.get("/api/public/catalog/flooring/snapshot")
                self.assertEqual(response.status_code, 200)
                payload = response.json()

                self.assertEqual(payload["version"], "flooring-v2")
                self.assertIn("coverings", payload)
                self.assertIn("preparations", payload)
                self.assertIn("layouts", payload)
                self.assertIn("plinthTypes", payload)
                self.assertIn("globalAddons", payload)

                plinth_codes = {item["code"] for item in payload["plinthTypes"]}
                self.assertEqual(plinth_codes, EXPECTED_PLINTH_CODES)

                for section in ("coverings", "preparations", "layouts"):
                    for item in payload[section]:
                        self.assertIn("specLines", item)
                        self.assertGreater(len(item["specLines"]), 0)

                present_keys = _walk_keys(payload)
                leaked = present_keys & PUBLIC_FLOORING_FORBIDDEN_KEYS
                self.assertEqual(leaked, set(), f"Публичный снапшот раскрыл internal-поля: {sorted(leaked)}")

    def test_public_snapshot_matches_local_package_seed(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                payload = client.get("/api/public/catalog/flooring/snapshot").json()
                package_seed = build_flooring_v2_local_package_seed()

                self.assertEqual(payload["version"], package_seed["version"])
                self.assertEqual(payload["plinthTypes"], package_seed["plinthTypes"])
                self.assertEqual(payload["globalAddons"], package_seed["globalAddons"])

                for item in payload["coverings"]:
                    self.assertIn("specLines", item)
                for item in payload["preparations"]:
                    self.assertIn("specLines", item)
                for item in payload["layouts"]:
                    self.assertIn("specLines", item)

    def test_build_from_catalog_omits_rows_without_valid_package(self) -> None:
        payload = build_public_flooring_snapshot_from_catalog(
            [{"title": "Ламинат", "material_price_per_m2": 555, "labor_price_per_m2": 666, "base_waste_percent": 8, "underlay_mode": "none"}],
            [],
            [],
        )
        self.assertEqual(payload["coverings"], [])
        self.assertEqual(payload["preparations"], [])
        self.assertEqual(payload["layouts"], [])
        self.assertEqual(payload["plinthTypes"], DEFAULT_PUBLIC_FLOORING_SNAPSHOT["plinthTypes"])
        self.assertEqual(payload["globalAddons"], DEFAULT_PUBLIC_FLOORING_SNAPSHOT["globalAddons"])

    def test_build_from_catalog_omits_layout_without_assembly_even_with_default_labor(self) -> None:
        payload = build_public_flooring_snapshot_from_catalog(
            [],
            [],
            [
                {
                    "id": 21,
                    "title": "Клеевая",
                    "labor_price_per_m2": 0,
                    "labor_multiplier": 1.25,
                    "extra_waste_percent": 5,
                }
            ],
        )
        self.assertEqual(payload["layouts"], [])

    def test_build_from_catalog_omits_layout_with_invalid_assembly(self) -> None:
        payload = build_public_flooring_snapshot_from_catalog(
            [],
            [],
            [{"id": 22, "title": "Крупный формат", "labor_price_per_m2": 2000, "labor_multiplier": 1.2, "extra_waste_percent": 10}],
            layout_assemblies={
                22: {
                    "rows": [
                        _sample_assembly_row(
                            kind="material",
                            section="covering",
                            public_category="materials",
                        )
                    ]
                }
            },
        )
        self.assertEqual(payload["layouts"], [])

    def test_build_from_catalog_publishes_only_package_backed_rows(self) -> None:
        coverings = [
            {"id": 1, "title": title, "material_price_per_m2": 1000 + index, "labor_price_per_m2": 2000 + index, "base_waste_percent": 8, "underlay_mode": "none"}
            for index, title in enumerate(("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска"))
        ]
        preparations = [
            {"id": 10 + index, "title": title, "labor_price_per_m2": 100 + index, "material_price_per_m2": 200 + index}
            for index, title in enumerate(("Без подготовки", "Грунтование", "Наливной пол", "Гидроизоляция"))
        ]
        layouts = [
            {
                "id": 20 + index,
                "title": title,
                "labor_price_per_m2": 700 + index,
                "labor_multiplier": 1.1 + index * 0.05,
                "extra_waste_percent": index + 1,
            }
            for index, title in enumerate(("Прямая", "Крупный формат", "Клеевая", "Плавающая"))
        ]

        covering_assemblies = {
            int(row["id"]): {"rows": [_sample_assembly_row(title=row["title"], public_title=row["title"], price=row["material_price_per_m2"])]}
            for row in coverings
        }
        preparation_assemblies = {
            int(row["id"]): {
                "rows": [
                    _work_assembly_row(
                        title=row["title"],
                        public_title=row["title"],
                        price=row["labor_price_per_m2"],
                        consumption_per_m2=1,
                    )
                ]
            }
            for row in preparations
        }
        layout_assemblies = {
            int(row["id"]): {
                "rows": [
                    _work_assembly_row(
                        title=row["title"],
                        public_title=row["title"],
                        price=row["labor_price_per_m2"],
                        consumption_per_m2=row["labor_multiplier"],
                    )
                ]
            }
            for row in layouts
        }

        payload = build_public_flooring_snapshot_from_catalog(
            coverings,
            preparations,
            layouts,
            covering_assemblies=covering_assemblies,
            preparation_assemblies=preparation_assemblies,
            layout_assemblies=layout_assemblies,
        )
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertEqual(laminate["materialPricePerM2"], 1002)
        self.assertIn("specLines", laminate)
        self.assertEqual(
            next(item for item in payload["preparations"] if item["code"] == "primer")["laborPricePerM2"],
            101,
        )
        self.assertEqual(
            next(item for item in payload["layouts"] if item["code"] == "glue")["additionalWastePercent"],
            3,
        )
        self.assertEqual(
            next(item for item in payload["layouts"] if item["code"] == "glue")["laborPricePerM2"],
            702,
        )

    def test_known_layout_zero_labor_uses_default_v2_rate_before_publication(self) -> None:
        coverings = [
            {"id": 1, "title": title, "material_price_per_m2": 1000, "labor_price_per_m2": 0, "base_waste_percent": 8, "underlay_mode": "none"}
            for title in ("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска")
        ]
        preparations = [
            {"id": 10 + index, "title": title, "labor_price_per_m2": 100, "material_price_per_m2": 200}
            for index, title in enumerate(("Без подготовки", "Грунтование", "Наливной пол", "Гидроизоляция"))
        ]
        layouts = [
            {"id": 20 + index, "title": title, "labor_price_per_m2": 0, "labor_multiplier": 1, "extra_waste_percent": 0}
            for index, title in enumerate(("Прямая", "Крупный формат", "Клеевая", "Плавающая"))
        ]
        layout_assemblies = {
            int(row["id"]): {
                "rows": [
                    _work_assembly_row(
                        title=row["title"],
                        public_title=row["title"],
                        price=DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"][index]["laborPricePerM2"],
                        consumption_per_m2=1,
                    )
                ]
            }
            for index, row in enumerate(layouts)
        }
        payload = build_public_flooring_snapshot_from_catalog(
            coverings,
            preparations,
            layouts,
            layout_assemblies=layout_assemblies,
        )
        self.assertEqual(payload["coverings"], [])
        self.assertEqual(payload["preparations"], [])
        self.assertEqual(
            next(item for item in payload["layouts"] if item["code"] == "straight")["laborPricePerM2"],
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"][0]["laborPricePerM2"],
        )


if __name__ == "__main__":
    unittest.main()
