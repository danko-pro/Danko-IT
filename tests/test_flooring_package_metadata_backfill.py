from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.application.errors import ValidationError
from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.backfill_flooring_package_metadata import (
    BackfillFlooringPackageMetadataUseCase,
    backfill_covering_assembly_row,
    backfill_covering_assembly_rows,
    is_covering_consumable_package_aware,
)
from supply_bot.estimates.application.flooring_catalog_assembly import validate_flooring_package_for_publication
from supply_bot.estimates.application.flooring_package_projection import build_flooring_package_projection
from supply_bot.estimates.application.flooring_synthetic_assembly import (
    covering_flat_buckets_from_catalog_row,
    flat_buckets_are_equivalent,
)
from supply_bot.estimates.application.migrate_flooring_synthetic_assemblies import (
    MigrateGlobalFlooringSyntheticAssembliesUseCase,
)
from supply_bot.storage_bootstrap.defaults_flooring import FLOORING_COVERING_DEFAULTS
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


def _consumable_row(
    *,
    title: str,
    formula: str = "unit_consumption",
    unit: str = "kg",
    price: float = 45,
    consumption_per_m2: float = 4.5,
    package_size: float | None = None,
) -> dict[str, object]:
    row: dict[str, object] = {
        "section": "consumable",
        "kind": "consumable",
        "formula": formula,
        "title": title,
        "unit": unit,
        "price": price,
        "consumption_per_m2": consumption_per_m2,
        "sort_order": 20,
        "is_enabled": True,
        "public_category": "consumables",
        "public_title": title,
    }
    if package_size is not None:
        row["package_size"] = package_size
    return row


def _material_row(*, title: str = "Керамогранит", price: float = 3200) -> dict[str, object]:
    return {
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": title,
        "unit": "m2",
        "price": price,
        "consumption_per_m2": 1,
        "sort_order": 10,
        "is_enabled": True,
        "public_category": "materials",
        "public_title": title,
    }


def _porcelain_kwargs() -> dict[str, object]:
    seed = next(item for item in FLOORING_COVERING_DEFAULTS if item[0] == "Керамогранит")
    return {
        "title": seed[0],
        "material_price_per_m2": seed[1],
        "labor_price_per_m2": seed[2],
        "base_waste_percent": seed[3],
        "underlay_mode": "none",
        "underlay_consumption_per_m2": 0,
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
        "custom_consumables_json": "[]",
        "needs_plinth": False,
    }


class BackfillCoveringAssemblyRowTests(unittest.TestCase):
    def test_porcelain_adhesive_backfilled_from_unit_consumption(self) -> None:
        row = _consumable_row(title="Клей", unit="kg", price=45, consumption_per_m2=4.5)
        self.assertFalse(is_covering_consumable_package_aware(row))

        updated, changed = backfill_covering_assembly_row(row)
        self.assertTrue(changed)
        self.assertEqual(updated["formula"], "package_consumption")
        self.assertEqual(updated["package_size"], 25)
        self.assertEqual(updated["price"], 45 * 25)

    def test_svp_backfilled_from_unit_consumption(self) -> None:
        row = _consumable_row(title="СВП", formula="unit_consumption", unit="pcs", price=6, consumption_per_m2=25)
        updated, changed = backfill_covering_assembly_row(row)
        self.assertTrue(changed)
        self.assertEqual(updated["formula"], "piece_consumption")
        self.assertEqual(updated["package_size"], 500)
        self.assertEqual(updated["price"], 6 * 500)

    def test_svp_piece_consumption_without_package_size_backfilled(self) -> None:
        row = _consumable_row(
            title="СВП 2 мм",
            formula="piece_consumption",
            unit="pcs",
            price=30,
            consumption_per_m2=4,
        )
        updated, changed = backfill_covering_assembly_row(row)
        self.assertTrue(changed)
        self.assertEqual(updated["package_size"], 500)
        self.assertEqual(updated["price"], 30 * 500)

    def test_idempotent_second_backfill_does_not_double_price(self) -> None:
        row = _consumable_row(title="Клей", unit="kg", price=45, consumption_per_m2=4.5)
        first, _ = backfill_covering_assembly_row(row)
        second, changed = backfill_covering_assembly_row(first)
        self.assertFalse(changed)
        self.assertEqual(second["price"], 45 * 25)

    def test_package_aware_row_unchanged(self) -> None:
        row = _consumable_row(
            title="Клей",
            formula="package_consumption",
            price=1125,
            consumption_per_m2=4.5,
            package_size=25,
        )
        self.assertTrue(is_covering_consumable_package_aware(row))
        updated, changed = backfill_covering_assembly_row(row)
        self.assertFalse(changed)
        self.assertEqual(updated["price"], 1125)

    def test_underlay_unit_consumption_not_backfilled(self) -> None:
        row = _consumable_row(title="Подложка", unit="m2", price=220, consumption_per_m2=1)
        updated, changed = backfill_covering_assembly_row(row)
        self.assertFalse(changed)
        self.assertEqual(updated["formula"], "unit_consumption")


class ValidateCoveringConsumablePackageMetadataTests(unittest.TestCase):
    def test_rejects_raw_glue_on_covering_put(self) -> None:
        rows = [
            _material_row(),
            _consumable_row(title="Клей", formula="unit_consumption", price=45, consumption_per_m2=4.5),
        ]
        with self.assertRaises(ValidationError):
            validate_flooring_package_for_publication("covering", rows)

    def test_allows_raw_underlay_on_covering(self) -> None:
        rows = [
            _material_row(),
            _consumable_row(title="Подложка", unit="m2", price=220, consumption_per_m2=1),
        ]
        validate_flooring_package_for_publication("covering", rows)

    def test_preparation_work_only_unaffected(self) -> None:
        validate_flooring_package_for_publication(
            "preparation",
            [
                {
                    "section": "work",
                    "kind": "work",
                    "formula": "flat_per_m2",
                    "title": "Грунтование",
                    "unit": "m2",
                    "price": 60,
                    "consumption_per_m2": 1,
                    "sort_order": 10,
                    "is_enabled": True,
                    "public_category": "works",
                    "public_title": "Грунтование",
                }
            ],
        )


class BackfillFlooringPackageMetadataUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def _save_raw_porcelain_assembly(self, covering_id: int) -> None:
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            covering_id,
            "Керамогранит (legacy raw)",
            [
                _material_row(title="Керамогранит"),
                _consumable_row(title="Клей", unit="kg", price=45, consumption_per_m2=4.5),
                _consumable_row(title="СВП", formula="unit_consumption", unit="pcs", price=6, consumption_per_m2=25),
                _consumable_row(title="Грунт", formula="unit_consumption", unit="l", price=120, consumption_per_m2=0.15),
            ],
        )

    async def test_use_case_backfills_porcelain_glue_and_svp_with_projection_metadata(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_porcelain_kwargs())
        await self._save_raw_porcelain_assembly(covering_id)

        report = await BackfillFlooringPackageMetadataUseCase(self.repository).execute()
        self.assertEqual(report.assemblies_updated, 1)
        self.assertGreaterEqual(report.rows_backfilled, 2)

        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        projection = build_flooring_package_projection("covering", assembly["rows"])
        glue = next(line for line in projection["specLines"] if line["title"] == "Клей")
        svp = next(line for line in projection["specLines"] if line["title"] == "СВП")

        self.assertEqual(glue["purchaseMode"], "package")
        self.assertEqual(glue["packageSize"], 25)
        self.assertEqual(glue["packagePrice"], 45 * 25)
        self.assertEqual(glue["unitPrice"], 45)

        self.assertEqual(svp["purchaseMode"], "package")
        self.assertEqual(svp["packageSize"], 500)
        self.assertEqual(svp["packagePrice"], 6 * 500)
        self.assertEqual(svp["unitPrice"], 6)

        catalog_flat = covering_flat_buckets_from_catalog_row(_porcelain_kwargs())
        self.assertTrue(
            flat_buckets_are_equivalent(
                catalog_flat,
                projection["flat"],
                keys=(
                    "materialPricePerM2",
                    "adhesivePricePerM2",
                    "primerPricePerM2",
                    "svpPricePerM2",
                ),
            )
        )

    async def test_backfill_is_idempotent_on_restart(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_porcelain_kwargs())
        await self._save_raw_porcelain_assembly(covering_id)

        first = await BackfillFlooringPackageMetadataUseCase(self.repository).execute()
        second = await BackfillFlooringPackageMetadataUseCase(self.repository).execute()

        self.assertEqual(first.assemblies_updated, 1)
        self.assertEqual(second.assemblies_updated, 0)
        self.assertEqual(second.rows_backfilled, 0)

        assembly = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly is not None
        glue_row = next(row for row in assembly["rows"] if row["title"] == "Клей")
        self.assertEqual(glue_row["price"], 45 * 25)

    async def test_synthetic_migration_then_backfill_leaves_package_aware_rows(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_porcelain_kwargs())
        await MigrateGlobalFlooringSyntheticAssembliesUseCase(self.repository).execute()

        assembly_before = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly_before is not None
        rows_before, changes_before = backfill_covering_assembly_rows(assembly_before["rows"])
        self.assertEqual(changes_before, 0)

        report = await BackfillFlooringPackageMetadataUseCase(self.repository).execute()
        self.assertEqual(report.assemblies_updated, 0)

        assembly_after = await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id)
        assert assembly_after is not None
        projection = build_flooring_package_projection("covering", assembly_after["rows"])
        glue = next(line for line in projection["specLines"] if "Клей" in line["title"])
        self.assertEqual(glue["purchaseMode"], "package")
        self.assertEqual(glue["packageSize"], 25)

    async def test_invalid_legacy_assembly_is_skipped_without_aborting_backfill(self) -> None:
        valid_covering_id = await self.repository.create_estimate_flooring_covering(**_porcelain_kwargs())
        await self._save_raw_porcelain_assembly(valid_covering_id)

        invalid_covering_id = await self.repository.create_estimate_flooring_covering(
            **{
                **_porcelain_kwargs(),
                "title": "Керамогранит с битой строкой",
            }
        )
        await self.repository.replace_estimate_flooring_catalog_assembly(
            "covering",
            invalid_covering_id,
            "Legacy invalid unit",
            [
                _material_row(title="Керамогранит"),
                _consumable_row(title="Клей", unit="0,08", price=45, consumption_per_m2=4.5),
            ],
        )

        report = await BackfillFlooringPackageMetadataUseCase(self.repository).execute()

        self.assertEqual(report.assemblies_updated, 1)
        self.assertEqual(report.assemblies_skipped, 1)
        self.assertIn(valid_covering_id, report.updated_target_ids)
        self.assertIn(invalid_covering_id, report.skipped_target_ids)

        valid_assembly = await self.repository.get_estimate_flooring_catalog_assembly(
            "covering",
            valid_covering_id,
        )
        assert valid_assembly is not None
        glue_row = next(row for row in valid_assembly["rows"] if row["title"] == "Клей")
        self.assertEqual(glue_row["formula"], "package_consumption")
        self.assertEqual(glue_row["package_size"], 25)

        invalid_assembly = await self.repository.get_estimate_flooring_catalog_assembly(
            "covering",
            invalid_covering_id,
        )
        assert invalid_assembly is not None
        invalid_glue = next(row for row in invalid_assembly["rows"] if row["title"] == "Клей")
        self.assertEqual(invalid_glue["formula"], "unit_consumption")
        self.assertEqual(invalid_glue["unit"], "0,08")


if __name__ == "__main__":
    unittest.main()
