from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class SqlAlchemyEstimateWallFinishRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_wall_finish_catalog_config_rooms_and_zones_are_owner_scoped(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_covering_id = await global_repo.create_estimate_wall_finish_covering(
            title="Глобальная краска",
            material_price_per_m2=100,
            labor_price_per_m2=200,
            base_waste_percent=5,
            glue_consumption_per_m2=0,
            glue_unit="кг",
            glue_price_per_unit=0,
            primer_consumption_per_m2=0.1,
            primer_unit="л",
            primer_price_per_unit=100,
            putty_consumption_per_m2=0,
            putty_unit="кг",
            putty_price_per_unit=0,
            mesh_consumption_per_m2=0,
            mesh_unit="м2",
            mesh_price_per_unit=0,
            instrument_price_per_m2=0,
            custom_consumables_json="[]",
        )
        owner_covering_id = await owner_1.create_estimate_wall_finish_covering(
            title="Личные обои",
            material_price_per_m2=300,
            labor_price_per_m2=400,
            base_waste_percent=7,
            glue_consumption_per_m2=0.2,
            glue_unit="кг",
            glue_price_per_unit=200,
            primer_consumption_per_m2=0.1,
            primer_unit="л",
            primer_price_per_unit=100,
            putty_consumption_per_m2=0,
            putty_unit="кг",
            putty_price_per_unit=0,
            mesh_consumption_per_m2=0,
            mesh_unit="м2",
            mesh_price_per_unit=0,
            instrument_price_per_m2=0,
            custom_consumables_json="[]",
        )
        prep_id = await owner_1.create_estimate_wall_finish_preparation(
            title="Шпаклевка",
            labor_price_per_m2=50,
            material_price_per_m2=60,
            primer_consumption_per_m2=0.1,
            primer_unit="л",
            primer_price_per_unit=100,
        )
        layout_id = await owner_1.create_estimate_wall_finish_layout(
            title="Акцент",
            labor_multiplier=1.1,
            extra_waste_percent=2,
        )
        project_id = await owner_1.create_estimate_project(name="Стены")
        room_id = await owner_1.create_estimate_room(project_id=project_id, name="Гостиная")

        owner_1_coverings = {item["id"] for item in await owner_1.list_estimate_wall_finish_coverings()}
        owner_2_coverings = {item["id"] for item in await owner_2.list_estimate_wall_finish_coverings()}
        self.assertIn(global_covering_id, owner_1_coverings)
        self.assertIn(owner_covering_id, owner_1_coverings)
        self.assertIn(global_covering_id, owner_2_coverings)
        self.assertNotIn(owner_covering_id, owner_2_coverings)

        await owner_1.update_estimate_wall_finish_config(
            project_id,
            include_preparation=True,
            include_demolition=False,
            demolition_price_per_m2=140,
        )
        await owner_1.replace_estimate_wall_finish_rooms(
            project_id,
            [{"room_id": room_id, "covering_id": owner_covering_id, "preparation_id": prep_id, "layout_id": layout_id}],
        )
        await owner_1.replace_estimate_wall_finish_room_zones(
            project_id,
            [{"room_id": room_id, "covering_id": owner_covering_id, "preparation_id": prep_id, "area_m2": 20.0}],
        )

        self.assertEqual((await owner_1.get_estimate_wall_finish_config(project_id))["demolition_price_per_m2"], 140)
        self.assertEqual((await owner_1.list_estimate_wall_finish_rooms(project_id))[0]["room_id"], room_id)
        self.assertEqual((await owner_1.list_estimate_wall_finish_room_zones(project_id))[0]["area_m2"], 20.0)
        self.assertIsNone(await owner_2.get_estimate_wall_finish_config(project_id))
