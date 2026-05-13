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


class SqlAlchemyProjectContractsRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyProjectWorkspaceRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_contracts_are_owner_scoped_and_upserted(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-030", "Договор"))
        await owner_2.create_project(**project_payload("P-031", "Чужой договор"))

        contract_id = await owner_1.upsert_project_contract(
            project_id,
            number="D-001",
            title="Основной договор",
            source_storage_key="contracts/d-001.pdf",
            source_filename="d-001.pdf",
        )
        same_contract_id = await owner_1.upsert_project_contract(project_id, title="Основной договор обновлен")

        self.assertEqual(contract_id, same_contract_id)
        contract = await owner_1.get_project_contract(project_id)
        self.assertEqual(contract["title"], "Основной договор обновлен")
        self.assertEqual(contract["source_storage_key"], "contracts/d-001.pdf")
        self.assertIsNone(await owner_2.get_project_contract(project_id))

        self.assertFalse(await owner_2.delete_project_contract(project_id))
        self.assertTrue(await owner_1.delete_project_contract(project_id))
        self.assertIsNone(await owner_1.get_project_contract(project_id))

    async def test_contract_milestones_are_owner_scoped_and_stably_ordered(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-032", "Этапы"))
        contract_id = await owner_1.upsert_project_contract(project_id, number="D-002", title="Договор с этапами")

        milestone_ids = await owner_1.replace_project_contract_milestones(
            contract_id,
            [
                {"title": "Первый этап", "amount": 100.0, "status": "planned"},
                {"title": "Второй этап", "amount": 200.0, "status": "planned"},
            ],
        )

        self.assertEqual(len(milestone_ids), 2)
        milestones = await owner_1.list_project_contract_milestones(contract_id)
        self.assertEqual([milestone["title"] for milestone in milestones], ["Первый этап", "Второй этап"])
        self.assertEqual(await owner_2.list_project_contract_milestones(contract_id), [])
        self.assertIsNone(await owner_2.get_project_contract_milestone(milestone_ids[0]))

        self.assertFalse(await owner_2.update_project_contract_milestone(milestone_ids[0], status="paid"))
        self.assertTrue(await owner_1.update_project_contract_milestone(milestone_ids[0], status="paid"))
        self.assertEqual((await owner_1.get_project_contract_milestone(milestone_ids[0]))["status"], "paid")
