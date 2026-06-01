from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class SqlAlchemyEstimateFlooringRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_flooring_catalog_config_rooms_and_zones_are_owner_scoped(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_covering_id = await global_repo.create_estimate_flooring_covering(
            title="Глобальный ламинат",
            material_price_per_m2=100,
            labor_price_per_m2=200,
            base_waste_percent=5,
            underlay_mode="none",
            underlay_consumption_per_m2=1,
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
            custom_consumables_json="[]",
            needs_plinth=True,
            instrument_price_per_m2=0,
        )
        owner_covering_id = await owner_1.create_estimate_flooring_covering(
            title="Личный паркет",
            material_price_per_m2=300,
            labor_price_per_m2=400,
            base_waste_percent=7,
            underlay_mode="roll",
            underlay_consumption_per_m2=1,
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
            custom_consumables_json="[]",
            needs_plinth=True,
            instrument_price_per_m2=0,
        )
        prep_id = await owner_1.create_estimate_flooring_preparation(
            title="Подготовка",
            labor_price_per_m2=50,
            material_price_per_m2=60,
            primer_consumption_per_m2=0.1,
            primer_unit="л",
            primer_price_per_unit=100,
        )
        layout_id = await owner_1.create_estimate_flooring_layout(
            title="Диагональ",
            labor_price_per_m2=1200,
            labor_multiplier=1.2,
            extra_waste_percent=3,
        )
        project_id = await owner_1.create_estimate_project(name="Полы")
        room_id = await owner_1.create_estimate_room(project_id=project_id, name="Комната")

        owner_1_coverings = {item["id"] for item in await owner_1.list_estimate_flooring_coverings()}
        owner_2_coverings = {item["id"] for item in await owner_2.list_estimate_flooring_coverings()}
        self.assertIn(global_covering_id, owner_1_coverings)
        self.assertIn(owner_covering_id, owner_1_coverings)
        self.assertIn(global_covering_id, owner_2_coverings)
        self.assertNotIn(owner_covering_id, owner_2_coverings)

        await owner_1.update_estimate_flooring_config(
            project_id,
            include_underlay=True,
            include_plinth=True,
            include_demolition=False,
            include_preparation=True,
            default_preparation_id=prep_id,
            demolition_price_per_m2=150,
            underlay_price_per_m2=120,
            plinth_material_price_per_m=180,
            plinth_install_price_per_m=250,
            threshold_profile_count=1,
            threshold_profile_price=900,
            global_items_json="[]",
        )
        await owner_1.replace_estimate_flooring_rooms(
            project_id,
            [{"room_id": room_id, "covering_id": owner_covering_id, "preparation_id": prep_id, "layout_id": layout_id}],
        )
        await owner_1.replace_estimate_flooring_room_zones(
            project_id,
            [{"room_id": room_id, "covering_id": owner_covering_id, "preparation_id": prep_id, "area_m2": 12.5}],
        )

        self.assertEqual((await owner_1.get_estimate_flooring_config(project_id))["default_preparation_id"], prep_id)
        self.assertEqual((await owner_1.list_estimate_flooring_rooms(project_id))[0]["room_id"], room_id)
        self.assertEqual((await owner_1.list_estimate_flooring_room_zones(project_id))[0]["area_m2"], 12.5)
        self.assertIsNone(await owner_2.get_estimate_flooring_config(project_id))
