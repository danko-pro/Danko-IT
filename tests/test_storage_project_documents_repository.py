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


class SqlAlchemyProjectDocumentsRepositoryTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)
        self.repository = SqlAlchemyProjectWorkspaceRepository(self.session_factory)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_ledger_documents_are_owner_scoped_and_upserted(self) -> None:
        owner_1 = self.repository.for_owner(1)
        owner_2 = self.repository.for_owner(2)
        project_id = await owner_1.create_project(**project_payload("P-020", "Документы"))
        await owner_2.create_project(**project_payload("P-021", "Чужие документы"))
        entry_id = await owner_1.create_project_ledger_entry(
            project_id,
            title="Материал",
            category="Материалы",
            status="planned",
            plan_amount=50.0,
            actual_amount=0.0,
        )

        document_id = await owner_1.upsert_project_ledger_document(
            entry_id,
            "invoice",
            title="Счет 1",
            storage_key="projects/p-020/invoice-1.pdf",
            filename="invoice-1.pdf",
            mime_type="application/pdf",
            size_bytes=10,
        )
        same_document_id = await owner_1.upsert_project_ledger_document(
            entry_id,
            "invoice",
            title="Счет 1 обновлен",
            storage_key="projects/p-020/invoice-1-new.pdf",
        )

        self.assertEqual(document_id, same_document_id)
        document = await owner_1.get_project_ledger_document(entry_id, "invoice")
        self.assertEqual(document["title"], "Счет 1 обновлен")
        self.assertIsNone(await owner_2.get_project_ledger_document(entry_id, "invoice"))
        self.assertEqual(len(await owner_1.list_project_ledger_documents(project_id)), 1)
        self.assertEqual(len(await owner_2.list_project_ledger_documents(project_id)), 0)

        self.assertFalse(await owner_2.update_project_ledger_document(document_id, title="Чужая правка"))
        self.assertTrue(await owner_1.update_project_ledger_document(document_id, title="Финальный счет"))
        self.assertEqual((await owner_1.get_project_ledger_document(entry_id, "invoice"))["title"], "Финальный счет")
        self.assertFalse(await owner_2.delete_project_ledger_document(document_id))
        self.assertTrue(await owner_1.delete_project_ledger_document(document_id))
        self.assertIsNone(await owner_1.get_project_ledger_document(entry_id, "invoice"))
