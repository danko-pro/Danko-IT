from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.flooring_catalog_assembly import validate_flooring_package_for_publication
from supply_bot.estimates.application.flooring_package_projection import build_flooring_package_projection
from supply_bot.estimates.application.flooring_synthetic_assembly import (
    build_synthetic_flooring_catalog_assembly,
    catalog_updates_for_synthetic_assembly,
    covering_flat_buckets_from_catalog_row,
    flat_buckets_are_equivalent,
    layout_flat_buckets_from_catalog_row,
    preparation_flat_buckets_from_catalog_row,
)
from supply_bot.estimates.application.migrate_flooring_synthetic_assemblies import (
    MigrateGlobalFlooringSyntheticAssembliesUseCase,
)
from supply_bot.storage_bootstrap.defaults_flooring import (
    FLOORING_COVERING_DEFAULTS,
    FLOORING_LAYOUT_DEFAULTS,
    FLOORING_PREPARATION_DEFAULTS,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


def _covering_kwargs(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "title": "Плитка",
        "material_price_per_m2": 2800,
        "labor_price_per_m2": 0,
        "base_waste_percent": 10,
        "underlay_mode": "none",
        "underlay_consumption_per_m2": 0,
        "glue_consumption_per_m2": 4.0,
        "glue_unit": "кг",
        "glue_price_per_unit": 40,
        "primer_consumption_per_m2": 0.15,
        "primer_unit": "л",
        "primer_price_per_unit": 120,
        "svp_consumption_per_m2": 20,
        "svp_unit": "шт",
        "svp_price_per_unit": 6,
        "grout_consumption_per_m2": 0.35,
        "grout_unit": "кг",
        "grout_price_per_unit": 240,
        "custom_consumables_json": "[]",
        "needs_plinth": False,
        "instrument_price_per_m2": 140,
    }
    values.update(overrides)
    return values


class BuildSyntheticFlooringCatalogAssemblyTests(unittest.TestCase):
    def test_covering_builds_material_consumables_and_tool_rows(self) -> None:
        row = _covering_kwargs()
        payload = build_synthetic_flooring_catalog_assembly("covering", row)

        self.assertIn("технический пакет PF2", payload.title)
        kinds = {item["kind"] for item in payload.rows}
        self.assertEqual(kinds, {"material", "consumable", "tool"})
        validate_flooring_package_for_publication("covering", payload.rows)

        projection = build_flooring_package_projection("covering", payload.rows)
        expected = covering_flat_buckets_from_catalog_row(row)
        self.assertTrue(
            flat_buckets_are_equivalent(
                expected,
                projection["flat"],
                keys=(
                    "materialPricePerM2",
                    "adhesivePricePerM2",
                    "primerPricePerM2",
                    "svpPricePerM2",
                    "groutPricePerM2",
                    "toolConsumablesPerM2",
                ),
            )
        )

    def test_preparation_builds_work_row_and_preserves_material_on_catalog_update(self) -> None:
        row = {
            "title": "Грунтование",
            "labor_price_per_m2": 60,
            "material_price_per_m2": 35,
            "primer_consumption_per_m2": 0.15,
            "primer_unit": "л",
            "primer_price_per_unit": 120,
        }
        payload = build_synthetic_flooring_catalog_assembly("preparation", row)
        validate_flooring_package_for_publication("preparation", payload.rows)

        projection = build_flooring_package_projection("preparation", payload.rows)
        self.assertEqual(projection["flat"]["laborPricePerM2"], 60)
        self.assertEqual(projection["flat"]["materialPricePerM2"], 0)

        updates = catalog_updates_for_synthetic_assembly("preparation", row, payload.rows)
        self.assertEqual(updates["labor_price_per_m2"], 60)
        self.assertEqual(updates["material_price_per_m2"], 35)

    def test_layout_builds_multiplier_equivalent_work_row(self) -> None:
        row = {"title": "Диагональ", "labor_price_per_m2": 1300, "labor_multiplier": 1.15}
        payload = build_synthetic_flooring_catalog_assembly("layout", row)
        validate_flooring_package_for_publication("layout", payload.rows)

        projection = build_flooring_package_projection("layout", payload.rows)
        expected = layout_flat_buckets_from_catalog_row(row)
        self.assertEqual(projection["flat"]["laborPricePerM2"], expected["laborPricePerM2"])

        updates = catalog_updates_for_synthetic_assembly("layout", row, payload.rows)
        self.assertEqual(updates["labor_price_per_m2"], expected["laborPricePerM2"])
        self.assertEqual(updates["labor_multiplier"], expected["laborMultiplier"])

    def test_covering_consumables_emit_package_procurement_metadata(self) -> None:
        row = _covering_kwargs()
        payload = build_synthetic_flooring_catalog_assembly("covering", row)
        projection = build_flooring_package_projection("covering", payload.rows)

        glue = next(line for line in projection["specLines"] if line["title"] == "Клей")
        svp = next(line for line in projection["specLines"] if line["title"] == "СВП")

        self.assertEqual(glue["purchaseMode"], "package")
        self.assertEqual(glue["packageSize"], 25)
        self.assertEqual(glue["packagePrice"], 40 * 25)
        self.assertEqual(glue["unitPrice"], 40)

        self.assertEqual(svp["purchaseMode"], "package")
        self.assertEqual(svp["packageSize"], 500)
        self.assertEqual(svp["packagePrice"], 6 * 500)
        self.assertEqual(svp["unitPrice"], 6)

    def test_seed_defaults_project_to_equivalent_flat_buckets(self) -> None:
        for seed in FLOORING_COVERING_DEFAULTS:
            row = {
                "title": seed[0],
                "material_price_per_m2": seed[1],
                "labor_price_per_m2": seed[2],
                "glue_consumption_per_m2": seed[6],
                "glue_unit": seed[7],
                "glue_price_per_unit": seed[8],
                "primer_consumption_per_m2": seed[9],
                "primer_unit": seed[10],
                "primer_price_per_unit": seed[11],
                "svp_consumption_per_m2": seed[12],
                "svp_unit": seed[13],
                "svp_price_per_unit": seed[14],
                "grout_consumption_per_m2": seed[15],
                "grout_unit": seed[16],
                "grout_price_per_unit": seed[17],
                "instrument_price_per_m2": seed[19],
            }
            payload = build_synthetic_flooring_catalog_assembly("covering", row)
            projection = build_flooring_package_projection("covering", payload.rows)
            expected = covering_flat_buckets_from_catalog_row(row)
            self.assertTrue(
                flat_buckets_are_equivalent(
                    expected,
                    projection["flat"],
                    keys=(
                        "materialPricePerM2",
                        "adhesivePricePerM2",
                        "primerPricePerM2",
                        "svpPricePerM2",
                        "groutPricePerM2",
                        "toolConsumablesPerM2",
                    ),
                ),
                msg=row["title"],
            )

        for seed in FLOORING_PREPARATION_DEFAULTS:
            row = {
                "title": seed[0],
                "labor_price_per_m2": seed[1],
                "material_price_per_m2": seed[2],
            }
            payload = build_synthetic_flooring_catalog_assembly("preparation", row)
            projection = build_flooring_package_projection("preparation", payload.rows)
            expected = preparation_flat_buckets_from_catalog_row(row)
            self.assertEqual(projection["flat"]["laborPricePerM2"], expected["laborPricePerM2"])

        for seed in FLOORING_LAYOUT_DEFAULTS:
            row = {
                "title": seed[0],
                "labor_price_per_m2": seed[1],
                "labor_multiplier": seed[2],
            }
            payload = build_synthetic_flooring_catalog_assembly("layout", row)
            projection = build_flooring_package_projection("layout", payload.rows)
            expected = layout_flat_buckets_from_catalog_row(row)
            self.assertEqual(projection["flat"]["laborPricePerM2"], expected["laborPricePerM2"])


class MigrateGlobalFlooringSyntheticAssembliesTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_migrates_global_rows_without_assembly(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_covering_kwargs(title="Global tile"))
        preparation_id = await self.repository.create_estimate_flooring_preparation(
            title="Prep",
            labor_price_per_m2=280,
            material_price_per_m2=220,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        )
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="Straight",
            labor_price_per_m2=1000,
            labor_multiplier=1.05,
            extra_waste_percent=2,
        )

        report = await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()
        self.assertEqual(report.coverings_migrated, 1)
        self.assertEqual(report.preparations_migrated, 1)
        self.assertEqual(report.layouts_migrated, 1)

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        projection = build_flooring_package_projection("covering", assembly["rows"])
        self.assertTrue(
            flat_buckets_are_equivalent(
                covering_flat_buckets_from_catalog_row(_covering_kwargs(title="Global tile")),
                projection["flat"],
                keys=(
                    "materialPricePerM2",
                    "adhesivePricePerM2",
                    "primerPricePerM2",
                    "svpPricePerM2",
                    "groutPricePerM2",
                    "toolConsumablesPerM2",
                ),
            )
        )
        self.assertEqual(covering["underlay_mode"], "none")

        preparation = await self.repository.get_estimate_flooring_preparation(preparation_id)
        assert preparation is not None
        self.assertEqual(preparation["labor_price_per_m2"], 280)
        self.assertEqual(preparation["material_price_per_m2"], 220)

        layout = await self.repository.get_estimate_flooring_layout(layout_id)
        assert layout is not None
        self.assertEqual(layout["labor_price_per_m2"], 1050)
        self.assertEqual(layout["labor_multiplier"], 1.05)
        self.assertEqual(layout["extra_waste_percent"], 2)

    async def test_existing_assembly_is_not_overwritten(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_covering_kwargs(title="Manual"))
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Manual package",
            [
                {
                    "section": "covering",
                    "kind": "material",
                    "formula": "flat_per_m2",
                    "title": "Manual tile",
                    "unit": "m2",
                    "price": 999,
                    "consumption_per_m2": 1,
                    "sort_order": 10,
                    "is_enabled": True,
                    "public_category": "materials",
                    "public_title": "Manual tile",
                }
            ],
        )

        report = await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()
        self.assertEqual(report.coverings_migrated, 0)
        self.assertEqual(report.skipped_existing_assembly, 1)

        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        self.assertEqual(assembly["title"], "Manual package")
        self.assertEqual(assembly["rows"][0]["price"], 999)

    async def test_migration_is_idempotent(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_covering_kwargs(title="Once"))
        first = await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()
        second = await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()

        self.assertEqual(first.coverings_migrated, 1)
        self.assertEqual(second.coverings_migrated, 0)
        self.assertEqual(second.skipped_existing_assembly, 1)

        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        validate_flooring_package_for_publication("covering", assembly["rows"])

    async def test_owner_scoped_rows_are_ignored(self) -> None:
        owner_repo = self.repository.for_owner(42)
        owner_covering_id = await owner_repo.create_estimate_flooring_covering(**_covering_kwargs(title="Owner only"))

        report = await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()
        self.assertEqual(report.coverings_migrated, 0)
        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("covering", owner_covering_id))
        self.assertIsNone(await owner_repo.get_estimate_flooring_catalog_assembly("covering", owner_covering_id))


if __name__ == "__main__":
    unittest.main()
