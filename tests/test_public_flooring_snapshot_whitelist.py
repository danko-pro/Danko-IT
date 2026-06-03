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
from supply_bot.estimates.application.flooring_snapshot import (
    DEFAULT_PUBLIC_FLOORING_SNAPSHOT,
    EXPECTED_COVERING_CODES,
    EXPECTED_LAYOUT_CODES,
    EXPECTED_PLINTH_CODES,
    EXPECTED_PREPARATION_CODES,
    PUBLIC_FLOORING_FORBIDDEN_KEYS,
    BuildFlooringSnapshotUseCase,
    _aggregate_covering_consumables,
    _attach_spec_lines_to_snapshot_row,
    _resolve_public_code,
    build_public_flooring_snapshot_from_catalog,
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


class FlooringSnapshotSpecLinesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_row_without_assembly_has_no_spec_lines(self) -> None:
        await self.repository.create_estimate_flooring_covering(**_minimal_covering_kwargs(title="Ламинат"))
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertNotIn("specLines", laminate)

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
                    unit="m2",
                    price=220,
                    consumption_per_m2=1,
                    public_category="consumables",
                ),
            ],
        )
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertIn("specLines", laminate)
        self.assertEqual(len(laminate["specLines"]), 2)
        self.assertEqual(laminate["specLines"][0]["title"], "Ламинат доска")
        self.assertEqual(laminate["materialPricePerM2"], 930)

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
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertNotIn("specLines", laminate)
        self.assertEqual(
            laminate["materialPricePerM2"],
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"][2]["materialPricePerM2"],
        )

    def test_empty_assembly_rows_omit_spec_lines(self) -> None:
        row = _attach_spec_lines_to_snapshot_row(
            {"code": "laminate", "title": "Ламинат", "materialPricePerM2": 930},
            target_kind="covering",
            assembly={"rows": []},
        )
        self.assertNotIn("specLines", row)

    def test_shell_assembly_with_disabled_rows_omits_spec_lines(self) -> None:
        row = _attach_spec_lines_to_snapshot_row(
            {"code": "laminate", "title": "Ламинат", "materialPricePerM2": 930},
            target_kind="covering",
            assembly={"rows": [_sample_assembly_row(is_enabled=False)]},
        )
        self.assertNotIn("specLines", row)


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


class FlooringSnapshotRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_empty_global_catalog_falls_back_to_default_snapshot(self) -> None:
        payload = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        self.assertEqual(payload, DEFAULT_PUBLIC_FLOORING_SNAPSHOT)

    async def test_known_global_rows_override_default_values(self) -> None:
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
        straight = next(item for item in payload["layouts"] if item["code"] == "straight")
        self.assertEqual(straight["laborPricePerM2"], 1234)
        self.assertEqual({item["code"] for item in payload["coverings"]}, EXPECTED_COVERING_CODES)

    async def test_custom_global_row_appears_with_stable_code(self) -> None:
        await self.repository.create_estimate_flooring_covering(
            **_minimal_covering_kwargs(title="Паркет ручной работы", material_price_per_m2=7777)
        )
        first = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        second = await BuildFlooringSnapshotUseCase(self.repository).build_public()
        custom_rows = [item for item in first["coverings"] if item["code"] not in EXPECTED_COVERING_CODES]
        self.assertEqual(len(custom_rows), 1)
        self.assertEqual(custom_rows[0]["materialPricePerM2"], 7777)
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
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertEqual(laminate["materialPricePerM2"], DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"][2]["materialPricePerM2"])


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

                covering_codes = {item["code"] for item in payload["coverings"]}
                preparation_codes = {item["code"] for item in payload["preparations"]}
                layout_codes = {item["code"] for item in payload["layouts"]}
                plinth_codes = {item["code"] for item in payload["plinthTypes"]}

                self.assertTrue(EXPECTED_COVERING_CODES.issubset(covering_codes))
                self.assertTrue(EXPECTED_PREPARATION_CODES.issubset(preparation_codes))
                self.assertTrue(EXPECTED_LAYOUT_CODES.issubset(layout_codes))
                self.assertEqual(plinth_codes, EXPECTED_PLINTH_CODES)

                present_keys = _walk_keys(payload)
                leaked = present_keys & PUBLIC_FLOORING_FORBIDDEN_KEYS
                self.assertEqual(leaked, set(), f"Публичный снапшот раскрыл internal-поля: {sorted(leaked)}")

    def test_public_snapshot_matches_generated_golden_numbers(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                payload = client.get("/api/public/catalog/flooring/snapshot").json()

                generated_snapshot = json.loads(_FLOORING_SNAPSHOT_PATH.read_text(encoding="utf-8"))
                self.assertEqual(generated_snapshot, DEFAULT_PUBLIC_FLOORING_SNAPSHOT)
                self.assertEqual(payload["version"], generated_snapshot["version"])

                laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
                self.assertGreater(laminate["materialPricePerM2"], 0)
                self.assertNotIn("laborPricePerM2", laminate)
                straight = next(item for item in payload["layouts"] if item["code"] == "straight")
                self.assertGreater(straight["laborPricePerM2"], 0)
                self.assertEqual(payload["globalAddons"]["thresholdPrice"], 900)
                self.assertEqual(payload["globalAddons"]["demolitionPricePerM2"], 150)

    def test_build_from_catalog_keeps_defaults_when_db_incomplete(self) -> None:
        payload = build_public_flooring_snapshot_from_catalog(
            [{"title": "Ламинат", "material_price_per_m2": 555, "labor_price_per_m2": 666, "base_waste_percent": 8, "underlay_mode": "none"}],
            [],
            [],
        )
        self.assertTrue(EXPECTED_COVERING_CODES.issubset({item["code"] for item in payload["coverings"]}))
        laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
        self.assertEqual(laminate["materialPricePerM2"], 555)
        porcelain = next(item for item in payload["coverings"] if item["code"] == "porcelain")
        self.assertEqual(
            porcelain["materialPricePerM2"],
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"][0]["materialPricePerM2"],
        )

    def test_build_from_catalog_overrides_defaults_when_f1_complete(self) -> None:
        coverings = [
            {"title": title, "material_price_per_m2": 1000 + index, "labor_price_per_m2": 2000 + index, "base_waste_percent": 8, "underlay_mode": "none"}
            for index, title in enumerate(("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска"))
        ]
        preparations = [
            {"title": title, "labor_price_per_m2": 100 + index, "material_price_per_m2": 200 + index}
            for index, title in enumerate(("Без подготовки", "Грунтование", "Наливной пол", "Гидроизоляция"))
        ]
        layouts = [
            {
                "title": title,
                "labor_price_per_m2": 700 + index,
                "labor_multiplier": 1.1 + index * 0.05,
                "extra_waste_percent": index + 1,
            }
            for index, title in enumerate(("Прямая", "Крупный формат", "Клеевая", "Плавающая"))
        ]
        payload = build_public_flooring_snapshot_from_catalog(coverings, preparations, layouts)
        self.assertEqual(
            next(item for item in payload["coverings"] if item["code"] == "laminate")["materialPricePerM2"],
            1002,
        )
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

    def test_known_layout_zero_labor_falls_back_to_default_v2_rate(self) -> None:
        coverings = [
            {"title": title, "material_price_per_m2": 1000, "labor_price_per_m2": 0, "base_waste_percent": 8, "underlay_mode": "none"}
            for title in ("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска")
        ]
        preparations = [
            {"title": title, "labor_price_per_m2": 100, "material_price_per_m2": 200}
            for title in ("Без подготовки", "Грунтование", "Наливной пол", "Гидроизоляция")
        ]
        layouts = [
            {"title": title, "labor_price_per_m2": 0, "labor_multiplier": 1, "extra_waste_percent": 0}
            for title in ("Прямая", "Крупный формат", "Клеевая", "Плавающая")
        ]
        payload = build_public_flooring_snapshot_from_catalog(coverings, preparations, layouts)
        self.assertEqual(
            next(item for item in payload["layouts"] if item["code"] == "straight")["laborPricePerM2"],
            DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"][0]["laborPricePerM2"],
        )


if __name__ == "__main__":
    unittest.main()
