from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata
from supply_bot.storage_projects.repository import SqlAlchemyProjectWorkspaceRepository


def project_payload(code: str, name: str) -> dict[str, object]:
    return {
        "code": code,
        "name": name,
        "address": "Калининград",
        "entrance_section": "1",
        "apartment": "10",
        "floor": "2",
        "room_count": 2,
        "has_elevator": False,
        "site_access": "свободный",
        "access_hours": "09:00-18:00",
        "intercom_code": "",
        "responsible_person": "Прораб",
        "comment": "",
        "stage_label": "Черновик",
        "stage_tone": "neutral",
        "estimate_project_id": None,
        "estimate_source": "manual",
        "area_m2": 50.0,
        "ceiling_height_m": 2.7,
        "received_total": 0.0,
        "remaining_total": 0.0,
        "deferred_total": 0.0,
        "planned_total": 0.0,
        "actual_total": 0.0,
        "work_per_m2": 0.0,
        "materials_per_m2": 0.0,
        "planned_margin_percent": 0.0,
        "next_delivery_label": "",
    }


class SqlAlchemyProjectRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyProjectWorkspaceRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_project_methods_require_owner(self) -> None:
        with self.assertRaises(RuntimeError):
            await self.repository.count_projects()

    async def test_projects_are_isolated_by_owner(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)

        project_1_id = await owner_1.create_project(**project_payload("P-001", "Проект 1"))
        project_2_id = await owner_2.create_project(**project_payload("P-002", "Проект 2"))

        self.assertEqual(await owner_1.count_projects(), 1)
        self.assertEqual(await owner_2.count_projects(), 1)
        self.assertEqual((await owner_1.get_project(project_1_id))["name"], "Проект 1")
        self.assertIsNone(await owner_1.get_project(project_2_id))
        self.assertIsNone(await owner_2.get_project(project_1_id))

        owner_1_projects = await owner_1.list_projects()
        owner_2_projects = await owner_2.list_projects()
        self.assertEqual([project["id"] for project in owner_1_projects], [project_1_id])
        self.assertEqual([project["id"] for project in owner_2_projects], [project_2_id])

    async def test_update_and_delete_project_respect_owner(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-003", "Старое имя"))

        self.assertFalse(await owner_2.update_project(project_id, name="Чужое имя"))
        self.assertTrue(await owner_1.update_project(project_id, name="Новое имя"))
        self.assertEqual((await owner_1.get_project(project_id))["name"], "Новое имя")
        self.assertFalse(await owner_2.delete_project(project_id))
        self.assertTrue(await owner_1.delete_project(project_id))
        self.assertIsNone(await owner_1.get_project(project_id))
