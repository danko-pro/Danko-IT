from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


class SqlAlchemyEstimateDoorsRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyEstimateRuntimeRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_doors_catalog_project_doors_and_components_are_owner_scoped(self) -> None:
        global_repo = self.repository
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        global_door_id = await global_repo.create_estimate_door_catalog_item(
            title="Глобальная дверь",
            width_mm=800,
            height_mm=2000,
            purchase_price=1000,
            sale_price=1500,
            install_price=500,
        )
        owner_door_id = await owner_1.create_estimate_door_catalog_item(
            title="Личная дверь",
            width_mm=900,
            height_mm=2100,
            purchase_price=2000,
            sale_price=2500,
            install_price=600,
        )
        component_id = await owner_1.create_estimate_door_component_catalog_item(
            category_code="hardware",
            title="Ручка",
            unit="шт",
            purchase_price=100,
            sale_price=150,
        )
        project_id = await owner_1.create_estimate_project(name="Двери")
        room_a_id = await owner_1.create_estimate_room(project_id=project_id, name="Холл")
        room_b_id = await owner_1.create_estimate_room(project_id=project_id, name="Комната")

        owner_1_catalog_ids = {item["id"] for item in await owner_1.list_estimate_door_catalog()}
        owner_2_catalog_ids = {item["id"] for item in await owner_2.list_estimate_door_catalog()}
        self.assertIn(global_door_id, owner_1_catalog_ids)
        self.assertIn(owner_door_id, owner_1_catalog_ids)
        self.assertIn(global_door_id, owner_2_catalog_ids)
        self.assertNotIn(owner_door_id, owner_2_catalog_ids)

        door_id = await owner_1.create_estimate_project_door(
            project_id=project_id,
            door_catalog_id=owner_door_id,
            title="Дверь 1",
            opening_kind="door",
            width_mm=900,
            height_mm=2100,
            thickness_mm=None,
            purchase_price=2000,
            sale_price=2500,
            install_price=600,
            room_a_id=room_a_id,
            room_b_id=room_b_id,
        )
        created_component_id = await owner_1.create_estimate_project_door_component(
            project_door_id=door_id,
            component_catalog_id=component_id,
            category_code="hardware",
            title="Ручка",
            unit="шт",
            quantity=2,
            purchase_price=100,
            sale_price=150,
        )

        door = (await owner_1.list_estimate_project_doors(project_id))[0]
        self.assertEqual(door["catalog_title"], "Личная дверь")
        self.assertEqual(door["area_m2"], 1.89)
        self.assertEqual((await owner_1.list_estimate_project_door_components(project_id))[0]["quantity"], 2)
        self.assertEqual(await owner_2.list_estimate_project_doors(project_id), [])
        self.assertIsNone(await owner_2.delete_estimate_project_door_component(created_component_id))
        self.assertIsNone(await owner_2.delete_estimate_project_door(door_id))
