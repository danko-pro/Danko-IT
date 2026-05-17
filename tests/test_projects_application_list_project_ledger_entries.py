from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.list_project_ledger_entries import (
    ListProjectLedgerEntriesCommand,
    ListProjectLedgerEntriesUseCase,
)
from tests.test_projects_application_list_projects import _project_row


def _ledger_entry_row(**overrides: object) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": 30,
        "project_id": 10,
        "category": "Работы",
        "item": "Rough works",
        "owner": "Owner",
        "counterparty": "Counterparty",
        "counterparty_inn": "",
        "counterparty_legal_name": "",
        "counterparty_manager_name": "",
        "counterparty_email": "",
        "counterparty_phone": "",
        "counterparty_messenger": "",
        "status": "planned",
        "plan_amount": 500,
        "actual_amount": 250,
        "control_date": "2026-05-20",
        "sort_order": 10,
        "created_at": "2026-05-10T10:00:00",
        "updated_at": "2026-05-10T11:00:00",
    }
    row.update(overrides)
    return row


def _ledger_document_row(**overrides: object) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": 40,
        "project_id": 10,
        "ledger_entry_id": 30,
        "kind": "invoice",
        "title": "Invoice",
        "date": "2026-05-21",
        "amount": 500,
        "source_file_name": "invoice.pdf",
        "source_mime_type": "application/pdf",
        "uploaded_at": "2026-05-21T10:00:00",
        "extracted_by_ai": False,
        "verified_by_user": True,
        "created_at": "2026-05-21T10:00:00",
        "updated_at": "2026-05-21T11:00:00",
    }
    row.update(overrides)
    return row


class FakeProjectLedgerEntriesListStorage:
    def __init__(
        self,
        *,
        project: Mapping[str, Any] | None,
        entries: list[Mapping[str, Any]] | None = None,
        documents: list[Mapping[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.entries = entries or []
        self.documents = documents or []
        self.get_project_calls: list[int] = []
        self.list_entries_calls: list[int] = []
        self.list_documents_calls: list[int] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        return self.project

    async def list_project_ledger_entries(self, project_id: int) -> list[Mapping[str, Any]]:
        self.list_entries_calls.append(project_id)
        return self.entries

    async def list_project_ledger_documents(self, project_id: int) -> list[Mapping[str, Any]]:
        self.list_documents_calls.append(project_id)
        return self.documents


class ListProjectLedgerEntriesUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_project_exists_returns_entries_with_attached_documents(self) -> None:
        storage = FakeProjectLedgerEntriesListStorage(
            project=_project_row(id=10),
            entries=[_ledger_entry_row(id=30)],
            documents=[
                _ledger_document_row(id=40, ledger_entry_id=30, kind="invoice", title="Invoice"),
                _ledger_document_row(id=41, ledger_entry_id=30, kind="act", title="Act"),
            ],
        )

        result = await ListProjectLedgerEntriesUseCase(storage).execute(
            ListProjectLedgerEntriesCommand(project_id=10)
        )

        self.assertEqual(storage.get_project_calls, [10])
        self.assertEqual(storage.list_entries_calls, [10])
        self.assertEqual(storage.list_documents_calls, [10])
        self.assertEqual(len(result), 1)
        entry = result[0]
        self.assertEqual(entry["id"], 30)
        self.assertEqual(entry["item"], "Rough works")
        self.assertEqual(entry["invoice_document"]["title"], "Invoice")
        self.assertEqual(entry["act_document"]["title"], "Act")

    async def test_missing_project_raises_not_found_without_loading_entries_or_documents(self) -> None:
        storage = FakeProjectLedgerEntriesListStorage(project=None, entries=[_ledger_entry_row()])

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await ListProjectLedgerEntriesUseCase(storage).execute(ListProjectLedgerEntriesCommand(project_id=404))

        self.assertEqual(storage.get_project_calls, [404])
        self.assertEqual(storage.list_entries_calls, [])
        self.assertEqual(storage.list_documents_calls, [])

    async def test_empty_entries_returns_empty_list(self) -> None:
        storage = FakeProjectLedgerEntriesListStorage(project=_project_row(id=10), entries=[], documents=[])

        result = await ListProjectLedgerEntriesUseCase(storage).execute(
            ListProjectLedgerEntriesCommand(project_id=10)
        )

        self.assertEqual(result, [])

    async def test_documents_for_unrelated_entries_are_ignored(self) -> None:
        storage = FakeProjectLedgerEntriesListStorage(
            project=_project_row(id=10),
            entries=[_ledger_entry_row(id=30)],
            documents=[_ledger_document_row(id=99, ledger_entry_id=999, kind="invoice")],
        )

        result = await ListProjectLedgerEntriesUseCase(storage).execute(
            ListProjectLedgerEntriesCommand(project_id=10)
        )

        self.assertIsNone(result[0]["invoice_document"])
        self.assertIsNone(result[0]["act_document"])
