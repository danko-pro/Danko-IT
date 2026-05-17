from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.projects.application.delete_project_ledger_entry import (
    DeleteProjectLedgerEntryCommand,
    DeleteProjectLedgerEntryUseCase,
)
from tests.test_projects_application_list_project_ledger_entries import _ledger_entry_row
from tests.test_projects_application_list_projects import _project_row
from tests.test_projects_application_update_project import _expected_project_payload_keys

_UNSET = object()


class FakeProjectLedgerEntryDeleteStorage:
    def __init__(
        self,
        *,
        initial_project: Mapping[str, Any] | None,
        deleted_project: Mapping[str, Any] | None | object = _UNSET,
        entry: Mapping[str, Any] | None = None,
        deleted: object = True,
    ) -> None:
        self.initial_project = initial_project
        self.deleted_project = initial_project if deleted_project is _UNSET else deleted_project
        self.entry = entry
        self.deleted = deleted
        self.get_project_calls: list[int] = []
        self.get_project_ledger_entry_calls: list[int] = []
        self.delete_project_ledger_entry_calls: list[int] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.initial_project
        return self.deleted_project

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None:
        self.get_project_ledger_entry_calls.append(entry_id)
        return self.entry

    async def delete_project_ledger_entry(self, entry_id: int) -> object:
        self.delete_project_ledger_entry_calls.append(entry_id)
        return self.deleted


class DeleteProjectLedgerEntryUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_existing_ledger_entry_returns_existing_response_shape(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=_project_row(id=10, planned_total=500),
            deleted_project=_project_row(id=10, planned_total=0),
            entry=_ledger_entry_row(id=30, project_id=10),
        )

        result = await DeleteProjectLedgerEntryUseCase(storage).execute(
            DeleteProjectLedgerEntryCommand(project_id=10, entry_id=30)
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.get_project_ledger_entry_calls, [30])
        self.assertEqual(storage.delete_project_ledger_entry_calls, [30])
        self.assertEqual(set(result), {"deleted", "entry_id", "project"})
        self.assertIs(result["deleted"], True)
        self.assertEqual(result["entry_id"], 30)
        self.assertEqual(result["project"]["planned_total"], 0.0)
        self.assertEqual(set(result["project"]), set(_expected_project_payload_keys()))

    async def test_missing_project_raises_not_found_without_entry_lookup_or_delete(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=None,
            entry=_ledger_entry_row(id=30, project_id=10),
        )

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await DeleteProjectLedgerEntryUseCase(storage).execute(
                DeleteProjectLedgerEntryCommand(project_id=404, entry_id=30)
            )

        self.assertEqual(storage.get_project_calls, [404])
        self.assertEqual(storage.get_project_ledger_entry_calls, [])
        self.assertEqual(storage.delete_project_ledger_entry_calls, [])

    async def test_missing_entry_raises_not_found_without_delete(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(initial_project=_project_row(id=10), entry=None)

        with self.assertRaisesRegex(NotFoundError, "Project ledger entry not found"):
            await DeleteProjectLedgerEntryUseCase(storage).execute(
                DeleteProjectLedgerEntryCommand(project_id=10, entry_id=404)
            )

        self.assertEqual(storage.get_project_ledger_entry_calls, [404])
        self.assertEqual(storage.delete_project_ledger_entry_calls, [])

    async def test_entry_for_other_project_raises_not_found_without_delete(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=_project_row(id=10),
            entry=_ledger_entry_row(id=30, project_id=99),
        )

        with self.assertRaisesRegex(NotFoundError, "Project ledger entry not found"):
            await DeleteProjectLedgerEntryUseCase(storage).execute(
                DeleteProjectLedgerEntryCommand(project_id=10, entry_id=30)
            )

        self.assertEqual(storage.get_project_ledger_entry_calls, [30])
        self.assertEqual(storage.delete_project_ledger_entry_calls, [])

    async def test_delete_operation_failed_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=_project_row(id=10),
            entry=_ledger_entry_row(id=30, project_id=10),
            deleted=False,
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry deletion failed"):
            await DeleteProjectLedgerEntryUseCase(storage).execute(
                DeleteProjectLedgerEntryCommand(project_id=10, entry_id=30)
            )

        self.assertEqual(storage.delete_project_ledger_entry_calls, [30])

    async def test_project_missing_after_delete_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=_project_row(id=10),
            deleted_project=None,
            entry=_ledger_entry_row(id=30, project_id=10),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry deletion failed"):
            await DeleteProjectLedgerEntryUseCase(storage).execute(
                DeleteProjectLedgerEntryCommand(project_id=10, entry_id=30)
            )

        self.assertEqual(storage.get_project_calls, [10, 10])

    async def test_response_shape_is_stable(self) -> None:
        storage = FakeProjectLedgerEntryDeleteStorage(
            initial_project=_project_row(id=10),
            deleted_project=_project_row(id=10),
            entry=_ledger_entry_row(id=40, project_id=10),
        )

        result = await DeleteProjectLedgerEntryUseCase(storage).execute(
            DeleteProjectLedgerEntryCommand(project_id=10, entry_id=40)
        )

        self.assertEqual(set(result), {"deleted", "entry_id", "project"})
        self.assertIs(result["deleted"], True)
        self.assertEqual(result["entry_id"], 40)
        self.assertEqual(set(result["project"]), set(_expected_project_payload_keys()))
