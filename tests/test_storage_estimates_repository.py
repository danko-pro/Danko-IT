from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class SqlAlchemyEstimateRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_estimate_projects_rooms_and_geometry_are_owner_scoped(self) -> None:
        with self.assertRaises(RuntimeError):
            await self.repository.list_estimate_projects()

        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_1_id = await owner_1.create_estimate_project(name="Проект 1")
        project_2_id = await owner_2.create_estimate_project(name="Проект 2")
        room_1_id = await owner_1.create_estimate_room(project_id=project_1_id, name="Кухня")
        room_2_id = await owner_2.create_estimate_room(project_id=project_2_id, name="Спальня")

        self.assertIsNone(await owner_1.get_estimate_project(project_2_id))
        self.assertIsNone(await owner_1.get_estimate_room(room_2_id))
        self.assertEqual([project["id"] for project in await owner_1.list_estimate_projects()], [project_1_id])
        self.assertEqual([room["id"] for room in await owner_1.list_estimate_rooms(project_1_id)], [room_1_id])
        self.assertEqual(await owner_1.list_estimate_rooms(project_2_id), [])

        await owner_1.replace_estimate_room_walls(room_1_id, [3.0, -1.0, 4.0])
        await owner_1.replace_estimate_room_floor_sections(room_1_id, [{"length_m": 3.0, "width_m": 4.0}])
        await owner_1.replace_estimate_room_openings(
            room_1_id,
            [{"opening_type": "door", "width_m": 0.9, "height_m": 2.0, "quantity": 1, "area_m2": None}],
        )

        self.assertEqual([wall["length_m"] for wall in await owner_1.list_estimate_room_walls(room_1_id)], [3.0, 4.0])
        self.assertEqual(await owner_2.list_estimate_room_walls(room_1_id), [])
        self.assertEqual((await owner_1.list_estimate_room_floor_sections(room_1_id))[0]["width_m"], 4.0)
        self.assertEqual((await owner_1.list_estimate_room_openings(room_1_id))[0]["opening_type"], "door")

        await owner_2.replace_estimate_room_walls(room_1_id, [10.0])
        self.assertEqual([wall["length_m"] for wall in await owner_1.list_estimate_room_walls(room_1_id)], [3.0, 4.0])
