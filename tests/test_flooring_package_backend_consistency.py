from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.application.errors import ValidationError
from supply_bot.database.metadata import metadata
from supply_bot.estimates.application.flooring_catalog_assembly import (
    FLOORING_FLAT_UPDATE_BLOCKED_BY_ASSEMBLY,
    FlooringCatalogAssemblyRowCommand,
    ReplaceFlooringCatalogAssemblyCommand,
    ReplaceFlooringCatalogAssemblyUseCase,
    validate_flooring_package_for_publication,
)
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    catalog_update_values_from_projection,
)
from supply_bot.estimates.application.update_flooring_catalog import (
    UpdateFlooringCoveringCommand,
    UpdateFlooringCoveringUseCase,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


def _sample_covering_kwargs(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "title": "Covering",
        "material_price_per_m2": 11,
        "labor_price_per_m2": 22,
        "base_waste_percent": 5,
        "underlay_mode": "none",
        "underlay_consumption_per_m2": 1,
        "glue_consumption_per_m2": 0,
        "glue_unit": "кг",
        "glue_price_per_unit": 0,
        "primer_consumption_per_m2": 0,
        "primer_unit": "л",
        "primer_price_per_unit": 0,
        "svp_consumption_per_m2": 0,
        "svp_unit": "шт",
        "svp_price_per_unit": 0,
        "grout_consumption_per_m2": 0,
        "grout_unit": "кг",
        "grout_price_per_unit": 0,
        "custom_consumables_json": "[]",
        "needs_plinth": True,
        "instrument_price_per_m2": 0,
    }
    values.update(overrides)
    return values


def _assembly_row_command(**overrides: object) -> FlooringCatalogAssemblyRowCommand:
    values: dict[str, object] = {
        "assembly_item_id": None,
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Tile",
        "unit": "m2",
        "price": 1500,
        "consumption_per_m2": 1.2,
        "package_size": None,
        "layer_mm": None,
        "sort_order": 10,
        "is_enabled": True,
        "public_category": "materials",
        "public_title": "Tile public",
    }
    values.update(overrides)
    return FlooringCatalogAssemblyRowCommand(**values)


class FlooringPackageBackendConsistencyTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_replace_assembly_projects_covering_flat_rates(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        use_case = ReplaceFlooringCatalogAssemblyUseCase(self.repository)
        await use_case.execute(
            ReplaceFlooringCatalogAssemblyCommand(
                target_kind="covering",
                target_id=covering_id,
                title="Package",
                version=None,
                rows=[_assembly_row_command()],
            )
        )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 1800)
        self.assertEqual(covering["labor_price_per_m2"], 0)

    async def test_replace_assembly_projects_preparation_work_flat(self) -> None:
        preparation_id = await self.repository.create_estimate_flooring_preparation(
            title="Prep",
            labor_price_per_m2=1,
            material_price_per_m2=2,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        )
        await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
            ReplaceFlooringCatalogAssemblyCommand(
                target_kind="preparation",
                target_id=preparation_id,
                title="Prep package",
                version=None,
                rows=[
                    _assembly_row_command(
                        section="work",
                        kind="work",
                        formula="flat_per_m2",
                        title="Level",
                        price=900,
                        consumption_per_m2=1.2,
                        public_category="works",
                        public_title="Level work",
                    )
                ],
            )
        )

        preparation = await self.repository.get_estimate_flooring_preparation(preparation_id)
        assert preparation is not None
        self.assertEqual(preparation["labor_price_per_m2"], 1080)
        self.assertEqual(preparation["material_price_per_m2"], 0)

    async def test_replace_assembly_projects_layout_labor_and_multiplier(self) -> None:
        layout_id = await self.repository.create_estimate_flooring_layout(
            title="Layout",
            labor_price_per_m2=1,
            labor_multiplier=1,
            extra_waste_percent=0,
        )
        await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
            ReplaceFlooringCatalogAssemblyCommand(
                target_kind="layout",
                target_id=layout_id,
                title="Layout package",
                version=None,
                rows=[
                    _assembly_row_command(
                        section="work",
                        kind="work",
                        formula="flat_per_m2",
                        title="Lay",
                        price=2000,
                        consumption_per_m2=1.25,
                        public_category="works",
                        public_title="Lay work",
                    )
                ],
            )
        )

        layout = await self.repository.get_estimate_flooring_layout(layout_id)
        assert layout is not None
        self.assertEqual(layout["labor_price_per_m2"], 2500)
        self.assertEqual(layout["labor_multiplier"], 1.25)

    async def test_empty_assembly_replace_rejected_flat_unchanged(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        with self.assertRaises(ValidationError):
            await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
                ReplaceFlooringCatalogAssemblyCommand(
                    target_kind="covering",
                    target_id=covering_id,
                    title="Cleared",
                    version=None,
                    rows=[],
                )
            )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 11)
        self.assertEqual(covering["labor_price_per_m2"], 22)
        self.assertIsNone(await self.repository.get_estimate_flooring_catalog_assembly("covering", covering_id))

    async def test_flat_patch_allowed_when_empty_assembly_rejected(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        with self.assertRaises(ValidationError):
            await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
                ReplaceFlooringCatalogAssemblyCommand(
                    target_kind="covering",
                    target_id=covering_id,
                    title="Shell only",
                    version=None,
                    rows=[],
                )
            )

        await UpdateFlooringCoveringUseCase(self.repository).execute(
            UpdateFlooringCoveringCommand(
                covering_id=covering_id,
                title="Covering",
                material_price_per_m2=9999,
                labor_price_per_m2=0,
                base_waste_percent=0,
                underlay_mode="none",
                underlay_consumption_per_m2=0,
                glue_consumption_per_m2=0,
                glue_unit="кг",
                glue_price_per_unit=0,
                primer_consumption_per_m2=0,
                primer_unit="л",
                primer_price_per_unit=0,
                svp_consumption_per_m2=0,
                svp_unit="шт",
                svp_price_per_unit=0,
                grout_consumption_per_m2=0,
                grout_unit="кг",
                grout_price_per_unit=0,
                custom_consumables=[],
                needs_plinth=True,
                instrument_price_per_m2=0,
                note=None,
            )
        )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 9999)

    async def test_flat_patch_allowed_after_delete_assembly(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
            ReplaceFlooringCatalogAssemblyCommand(
                target_kind="covering",
                target_id=covering_id,
                title="Valid package",
                version=None,
                rows=[_assembly_row_command()],
            )
        )
        deleted = await self.repository.delete_estimate_flooring_catalog_assembly("covering", covering_id)
        self.assertTrue(deleted)

        await UpdateFlooringCoveringUseCase(self.repository).execute(
            UpdateFlooringCoveringCommand(
                covering_id=covering_id,
                title="Covering",
                material_price_per_m2=77,
                labor_price_per_m2=0,
                base_waste_percent=0,
                underlay_mode="none",
                underlay_consumption_per_m2=0,
                glue_consumption_per_m2=0,
                glue_unit="кг",
                glue_price_per_unit=0,
                primer_consumption_per_m2=0,
                primer_unit="л",
                primer_price_per_unit=0,
                svp_consumption_per_m2=0,
                svp_unit="шт",
                svp_price_per_unit=0,
                grout_consumption_per_m2=0,
                grout_unit="кг",
                grout_price_per_unit=0,
                custom_consumables=[],
                needs_plinth=True,
                instrument_price_per_m2=0,
                note=None,
            )
        )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 77)

    async def test_all_disabled_assembly_replace_rejected_flat_unchanged(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        with self.assertRaises(ValidationError):
            await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
                ReplaceFlooringCatalogAssemblyCommand(
                    target_kind="covering",
                    target_id=covering_id,
                    title="All disabled",
                    version=None,
                    rows=[_assembly_row_command(is_enabled=False)],
                )
            )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 11)
        self.assertEqual(covering["labor_price_per_m2"], 22)

    async def test_flat_patch_allowed_when_all_disabled_assembly_rejected(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        with self.assertRaises(ValidationError):
            await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
                ReplaceFlooringCatalogAssemblyCommand(
                    target_kind="covering",
                    target_id=covering_id,
                    title="All disabled",
                    version=None,
                    rows=[_assembly_row_command(is_enabled=False)],
                )
            )

        await UpdateFlooringCoveringUseCase(self.repository).execute(
            UpdateFlooringCoveringCommand(
                covering_id=covering_id,
                title="Covering",
                material_price_per_m2=9999,
                labor_price_per_m2=0,
                base_waste_percent=0,
                underlay_mode="none",
                underlay_consumption_per_m2=0,
                glue_consumption_per_m2=0,
                glue_unit="кг",
                glue_price_per_unit=0,
                primer_consumption_per_m2=0,
                primer_unit="л",
                primer_price_per_unit=0,
                svp_consumption_per_m2=0,
                svp_unit="шт",
                svp_price_per_unit=0,
                grout_consumption_per_m2=0,
                grout_unit="кг",
                grout_price_per_unit=0,
                custom_consumables=[],
                needs_plinth=True,
                instrument_price_per_m2=0,
                note=None,
            )
        )

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 9999)

    async def test_flat_patch_rejected_when_assembly_present(self) -> None:
        covering_id = await self.repository.create_estimate_flooring_covering(**_sample_covering_kwargs())
        await ReplaceFlooringCatalogAssemblyUseCase(self.repository).execute(
            ReplaceFlooringCatalogAssemblyCommand(
                target_kind="covering",
                target_id=covering_id,
                title="Package",
                version=None,
                rows=[_assembly_row_command()],
            )
        )

        with self.assertRaises(ValidationError) as ctx:
            await UpdateFlooringCoveringUseCase(self.repository).execute(
                UpdateFlooringCoveringCommand(
                    covering_id=covering_id,
                    title="Covering",
                    material_price_per_m2=9999,
                    labor_price_per_m2=0,
                    base_waste_percent=0,
                    underlay_mode="none",
                    underlay_consumption_per_m2=0,
                    glue_consumption_per_m2=0,
                    glue_unit="кг",
                    glue_price_per_unit=0,
                    primer_consumption_per_m2=0,
                    primer_unit="л",
                    primer_price_per_unit=0,
                    svp_consumption_per_m2=0,
                    svp_unit="шт",
                    svp_price_per_unit=0,
                    grout_consumption_per_m2=0,
                    grout_unit="кг",
                    grout_price_per_unit=0,
                    custom_consumables=[],
                    needs_plinth=True,
                    instrument_price_per_m2=0,
                    note=None,
                )
            )
        self.assertEqual(str(ctx.exception), FLOORING_FLAT_UPDATE_BLOCKED_BY_ASSEMBLY)

        covering = await self.repository.get_estimate_flooring_covering(covering_id)
        assert covering is not None
        self.assertEqual(covering["material_price_per_m2"], 1800)

    async def test_owner_scoped_assembly_projection_does_not_touch_global_catalog(self) -> None:
        from supply_bot.estimates.application.flooring_package_projection import (
            build_flooring_package_projection,
            catalog_update_values_from_projection,
        )

        global_covering_id = await self.repository.create_estimate_flooring_covering(
            **_sample_covering_kwargs(title="Global", material_price_per_m2=10)
        )
        owner_repo = self.repository.for_owner(7)
        owner_covering_id = await owner_repo.create_estimate_flooring_covering(
            **_sample_covering_kwargs(title="Owner", material_price_per_m2=20)
        )
        row = {
            "section": "covering",
            "kind": "material",
            "formula": "flat_per_m2",
            "title": "Tile",
            "unit": "m2",
            "price": 500,
            "consumption_per_m2": 1,
            "sort_order": 10,
            "is_enabled": True,
            "public_category": "materials",
            "public_title": "Tile",
        }
        projection = build_flooring_package_projection("covering", [row])
        catalog_updates = catalog_update_values_from_projection("covering", projection, assembly_rows=[row])

        await owner_repo.replace_estimate_flooring_catalog_assembly(
            "covering",
            owner_covering_id,
            "Owner package",
            [row],
            catalog_updates=catalog_updates,
        )

        global_row = await self.repository.get_estimate_flooring_covering(global_covering_id)
        assert global_row is not None
        self.assertEqual(global_row["material_price_per_m2"], 10)

        owner_assembly = await owner_repo.get_estimate_flooring_catalog_assembly("covering", owner_covering_id)
        assert owner_assembly is not None
        self.assertEqual(owner_assembly["title"], "Owner package")


class FlooringPackageCatalogMappingTests(unittest.TestCase):
    def test_catalog_values_from_covering_projection(self) -> None:
        projection = build_flooring_package_projection(
            "covering",
            [
                {
                    "section": "covering",
                    "kind": "material",
                    "formula": "flat_per_m2",
                    "title": "Tile",
                    "unit": "m2",
                    "price": 1000,
                    "consumption_per_m2": 1.1,
                    "is_enabled": True,
                    "public_category": "materials",
                    "public_title": "Tile",
                }
            ],
        )
        values = catalog_update_values_from_projection("covering", projection)
        self.assertEqual(values["material_price_per_m2"], 1100)
        self.assertEqual(values["glue_consumption_per_m2"], 0)


if __name__ == "__main__":
    unittest.main()
