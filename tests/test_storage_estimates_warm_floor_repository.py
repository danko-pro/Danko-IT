from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class SqlAlchemyEstimateWarmFloorRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_warm_floor_config_and_rooms_are_owner_scoped(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_estimate_project(name="Проект")
        room_id = await owner_1.create_estimate_room(project_id=project_id, name="Санузел")

        config = await owner_1.ensure_estimate_warm_floor_config(project_id)
        self.assertEqual(config["project_id"], project_id)
        await owner_1.update_estimate_warm_floor_config(
            project_id,
            work_price_per_m2=1700,
            pipe_m_per_m2=6.5,
            max_contour_area_m2=14,
            small_zone_area_m2=4,
            manifold_work_price=6100,
            manifold_material_price=21000,
            pump_work_price=8100,
            pump_material_price=26000,
            pipe_price_per_m=180,
            pipe_material_title="Труба",
            manifold_material_items_json="[]",
            pump_material_items_json="[]",
            consumable_material_items_json="[]",
            pump_rooms_threshold=3,
            pump_contours_threshold=4,
        )
        await owner_1.replace_estimate_warm_floor_rooms(
            project_id,
            [{"room_id": room_id, "area_m2_override": 8.5, "note": "контур"}],
        )

        self.assertEqual((await owner_1.get_estimate_warm_floor_config(project_id))["work_price_per_m2"], 1700)
        self.assertEqual((await owner_1.list_estimate_warm_floor_rooms(project_id))[0]["area_m2_override"], 8.5)
        self.assertIsNone(await owner_2.get_estimate_warm_floor_config(project_id))
        self.assertEqual(await owner_2.list_estimate_warm_floor_rooms(project_id), [])
