from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata
from supply_bot.storage_projects.repository import SqlAlchemyProjectWorkspaceRepository

try:
    from tests.test_storage_projects_repository import project_payload
except ModuleNotFoundError:
    from test_storage_projects_repository import project_payload


class SqlAlchemyProjectAccountingRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyProjectWorkspaceRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_advances_are_isolated_and_update_project_totals(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-010", "Авансы"))
        await owner_2.create_project(**project_payload("P-011", "Чужой проект"))

        advance_id = await owner_1.create_project_advance(
            project_id,
            amount=100.0,
            paid=True,
            is_paid=True,
            status="paid",
            note="Первый аванс",
        )

        self.assertIsNotNone(await owner_1.get_project_advance(advance_id))
        self.assertIsNone(await owner_2.get_project_advance(advance_id))
        self.assertEqual(len(await owner_1.list_project_advances(project_id)), 1)
        self.assertEqual(len(await owner_2.list_project_advances(project_id)), 0)
        project = await owner_1.get_project(project_id)
        self.assertEqual(project["received_total"], 100.0)
        self.assertEqual(project["remaining_total"], 100.0)

        self.assertFalse(await owner_2.delete_project_advance(advance_id))
        self.assertTrue(await owner_1.delete_project_advance(advance_id))
        project = await owner_1.get_project(project_id)
        self.assertEqual(project["received_total"], 0.0)
        self.assertEqual(project["remaining_total"], 0.0)

    async def test_ledger_entries_are_isolated_and_refresh_summary(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-012", "Реестр"))

        entry_id = await owner_1.create_project_ledger_entry(
            project_id,
            title="Демонтаж",
            category="Работы",
            status="paid",
            plan_amount=200.0,
            actual_amount=150.0,
            due_date="2026-05-20",
        )

        self.assertIsNotNone(await owner_1.get_project_ledger_entry(entry_id))
        self.assertIsNone(await owner_2.get_project_ledger_entry(entry_id))
        self.assertEqual(len(await owner_1.list_project_ledger_entries(project_id)), 1)
        self.assertEqual(len(await owner_2.list_project_ledger_entries(project_id)), 0)
        project = await owner_1.get_project(project_id)
        self.assertEqual(project["planned_total"], 50.0)
        self.assertEqual(project["actual_total"], 150.0)

        self.assertFalse(await owner_2.update_project_ledger_entry(entry_id, actual_amount=300.0))
        self.assertTrue(await owner_1.update_project_ledger_entry(entry_id, status="planned", actual_amount=0.0))
        project = await owner_1.get_project(project_id)
        self.assertEqual(project["planned_total"], 200.0)
        self.assertEqual(project["actual_total"], 0.0)
        self.assertEqual(project["next_delivery_label"], "20.05")

        self.assertFalse(await owner_2.delete_project_ledger_entry(entry_id))
        self.assertTrue(await owner_1.delete_project_ledger_entry(entry_id))
        self.assertEqual(len(await owner_1.list_project_ledger_entries(project_id)), 0)
