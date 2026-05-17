from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.update_project_ledger_entry import (
    UpdateProjectLedgerEntryCommand,
    UpdateProjectLedgerEntryUseCase,
)
from tests.test_projects_application_list_project_ledger_entries import _ledger_document_row, _ledger_entry_row
from tests.test_projects_application_list_projects import _project_row

_UNSET = object()


def _counterparty_details(**overrides: str) -> SimpleNamespace:
    values = {
        "inn": "",
        "legalName": "",
        "managerName": "",
        "email": "",
        "phone": "",
        "messenger": "",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class FakeProjectLedgerEntryUpdateStorage:
    def __init__(
        self,
        *,
        initial_project: Mapping[str, Any] | None,
        updated_project: Mapping[str, Any] | None | object = _UNSET,
        initial_entry: Mapping[str, Any] | None = None,
        updated_entry: Mapping[str, Any] | None | object = _UNSET,
        invoice_document: Mapping[str, Any] | None = None,
        act_document: Mapping[str, Any] | None = None,
    ) -> None:
        self.initial_project = initial_project
        self.updated_project = initial_project if updated_project is _UNSET else updated_project
        self.initial_entry = initial_entry
        self.updated_entry = initial_entry if updated_entry is _UNSET else updated_entry
        self.invoice_document = invoice_document
        self.act_document = act_document
        self.get_project_calls: list[int] = []
        self.get_entry_calls: list[int] = []
        self.updated_entry_id: int | None = None
        self.updated_values: dict[str, Any] | None = None
        self.get_document_calls: list[tuple[int, str]] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.initial_project
        return self.updated_project

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None:
        self.get_entry_calls.append(entry_id)
        if len(self.get_entry_calls) == 1:
            return self.initial_entry
        return self.updated_entry

    async def update_project_ledger_entry(self, entry_id: int, **updates: Any) -> object:
        self.updated_entry_id = entry_id
        self.updated_values = updates
        return True

    async def get_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
    ) -> Mapping[str, Any] | None:
        self.get_document_calls.append((ledger_entry_id, kind))
        if kind == "invoice":
            return self.invoice_document
        if kind == "act":
            return self.act_document
        return None


class UpdateProjectLedgerEntryUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_updates_regular_fields_and_returns_existing_response_shape(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10, planned_total=0),
            updated_project=_project_row(id=10, planned_total=600),
            initial_entry=_ledger_entry_row(id=30, project_id=10, plan_amount=500),
            updated_entry=_ledger_entry_row(id=30, project_id=10, item="Final works", plan_amount=600),
        )

        result = await UpdateProjectLedgerEntryUseCase(storage).execute(
            UpdateProjectLedgerEntryCommand(
                project_id=10,
                entry_id=30,
                payload_data={
                    "category": "  Works  ",
                    "item": "  Final works  ",
                    "plan_amount": 600,
                    "status": "paid",
                },
            )
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.get_entry_calls, [30, 30])
        self.assertEqual(storage.updated_entry_id, 30)
        self.assertEqual(storage.updated_values["category"], "Works")
        self.assertEqual(storage.updated_values["item"], "Final works")
        self.assertEqual(storage.updated_values["plan_amount"], 600.0)
        self.assertEqual(storage.updated_values["status"], "paid")
        self.assertEqual(storage.get_document_calls, [(30, "invoice"), (30, "act")])
        self.assertEqual(set(result), {"entry", "project"})
        self.assertEqual(result["entry"]["item"], "Final works")
        self.assertEqual(result["project"]["planned_total"], 600.0)

    async def test_empty_patch_returns_current_entry_without_update_or_documents(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
        )

        result = await UpdateProjectLedgerEntryUseCase(storage).execute(
            UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={})
        )

        self.assertIsNone(storage.updated_values)
        self.assertEqual(storage.get_document_calls, [])
        self.assertEqual(set(result), {"entry", "project"})
        self.assertIsNone(result["entry"]["invoice_document"])
        self.assertIsNone(result["entry"]["act_document"])
        self.assertEqual(result["entry"]["id"], 30)
        self.assertEqual(result["project"]["id"], 10)

    async def test_missing_project_raises_not_found_without_loading_entry_or_update(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=None,
            initial_entry=_ledger_entry_row(),
        )

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=404, entry_id=30, payload_data={"item": "New"})
            )

        self.assertEqual(storage.get_project_calls, [404])
        self.assertEqual(storage.get_entry_calls, [])
        self.assertIsNone(storage.updated_values)

    async def test_missing_entry_raises_not_found_without_update(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(initial_project=_project_row(id=10), initial_entry=None)

        with self.assertRaisesRegex(NotFoundError, "Project ledger entry not found"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=404, payload_data={"item": "New"})
            )

        self.assertIsNone(storage.updated_values)

    async def test_entry_for_other_project_raises_not_found_without_update(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=99),
        )

        with self.assertRaisesRegex(NotFoundError, "Project ledger entry not found"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"item": "New"})
            )

        self.assertIsNone(storage.updated_values)

    async def test_validation_error_raises_application_validation_error_without_update(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
        )

        with self.assertRaisesRegex(ValidationError, "Plan amount cannot be negative"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"plan_amount": -1})
            )

        self.assertIsNone(storage.updated_values)

    async def test_missing_updated_entry_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
            updated_entry=None,
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry update failed"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"item": "New"})
            )

        self.assertEqual(storage.updated_entry_id, 30)

    async def test_updated_entry_for_other_project_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
            updated_entry=_ledger_entry_row(id=30, project_id=99),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry update failed"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"item": "New"})
            )

    async def test_missing_project_after_update_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            updated_project=None,
            initial_entry=_ledger_entry_row(id=30, project_id=10),
            updated_entry=_ledger_entry_row(id=30, project_id=10),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry update failed"):
            await UpdateProjectLedgerEntryUseCase(storage).execute(
                UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"item": "New"})
            )

        self.assertEqual(storage.get_project_calls, [10, 10])

    async def test_invoice_and_act_documents_are_attached_after_update(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
            updated_entry=_ledger_entry_row(id=30, project_id=10),
            invoice_document=_ledger_document_row(id=40, ledger_entry_id=30, kind="invoice", title="Invoice"),
            act_document=_ledger_document_row(id=41, ledger_entry_id=30, kind="act", title="Act"),
        )

        result = await UpdateProjectLedgerEntryUseCase(storage).execute(
            UpdateProjectLedgerEntryCommand(project_id=10, entry_id=30, payload_data={"item": "New"})
        )

        self.assertEqual(result["entry"]["invoice_document"]["title"], "Invoice")
        self.assertEqual(result["entry"]["act_document"]["title"], "Act")

    async def test_counterparty_details_update_is_normalized(self) -> None:
        storage = FakeProjectLedgerEntryUpdateStorage(
            initial_project=_project_row(id=10),
            initial_entry=_ledger_entry_row(id=30, project_id=10),
            updated_entry=_ledger_entry_row(
                id=30,
                project_id=10,
                counterparty_legal_name="LLC Warehouse",
                counterparty_inn="1234567890",
            ),
        )

        result = await UpdateProjectLedgerEntryUseCase(storage).execute(
            UpdateProjectLedgerEntryCommand(
                project_id=10,
                entry_id=30,
                payload_data={"counterparty_details": {}},
                counterparty_details=_counterparty_details(legalName="  LLC Warehouse  ", inn=" 1234567890 "),
            )
        )

        self.assertEqual(storage.updated_values["counterparty_legal_name"], "LLC Warehouse")
        self.assertEqual(storage.updated_values["counterparty_inn"], "1234567890")
        self.assertEqual(result["entry"]["counterparty_details"]["legalName"], "LLC Warehouse")
