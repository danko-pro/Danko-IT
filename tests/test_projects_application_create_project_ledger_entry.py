from __future__ import annotations

import unittest
from types import SimpleNamespace
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.create_project_ledger_entry import (
    CreateProjectLedgerEntryCommand,
    CreateProjectLedgerEntryUseCase,
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


def _ledger_payload(
    *,
    category: str | None = "Works",
    item: str | None = "Rough works",
    owner: str | None = "Owner",
    counterparty: str | None = "Counterparty",
    counterparty_details: SimpleNamespace | None = None,
    status: str | None = "planned",
    plan_amount: float | int | None = 500,
    actual_amount: float | int | None = 250,
    control_date: str | None = "2026-05-20",
) -> SimpleNamespace:
    return SimpleNamespace(
        category=category,
        item=item,
        owner=owner,
        counterparty=counterparty,
        counterparty_details=counterparty_details,
        status=status,
        plan_amount=plan_amount,
        actual_amount=actual_amount,
        control_date=control_date,
    )


class FakeProjectLedgerEntryCreateStorage:
    def __init__(
        self,
        *,
        initial_project: Mapping[str, Any] | None,
        created_project: Mapping[str, Any] | None | object = _UNSET,
        created_entry: Mapping[str, Any] | None = None,
        invoice_document: Mapping[str, Any] | None = None,
        act_document: Mapping[str, Any] | None = None,
        entry_id: int = 30,
    ) -> None:
        self.initial_project = initial_project
        self.created_project = initial_project if created_project is _UNSET else created_project
        self.created_entry = created_entry
        self.invoice_document = invoice_document
        self.act_document = act_document
        self.entry_id = entry_id
        self.get_project_calls: list[int] = []
        self.created_project_id: int | None = None
        self.created_sync_summary: bool | None = None
        self.created_values: dict[str, Any] | None = None
        self.get_entry_calls: list[int] = []
        self.get_document_calls: list[tuple[int, str]] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        if len(self.get_project_calls) == 1:
            return self.initial_project
        return self.created_project

    async def create_project_ledger_entry(self, *, project_id: int, sync_summary: bool, **values: Any) -> int:
        self.created_project_id = project_id
        self.created_sync_summary = sync_summary
        self.created_values = values
        return self.entry_id

    async def get_project_ledger_entry(self, entry_id: int) -> Mapping[str, Any] | None:
        self.get_entry_calls.append(entry_id)
        return self.created_entry

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


class CreateProjectLedgerEntryUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_valid_entry_returns_existing_response_shape(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(
            initial_project=_project_row(id=10, planned_total=0),
            created_project=_project_row(id=10, planned_total=500),
            created_entry=_ledger_entry_row(id=30, project_id=10),
        )

        result = await CreateProjectLedgerEntryUseCase(storage).execute(
            CreateProjectLedgerEntryCommand(
                project_id=10,
                payload=_ledger_payload(category="  Works  ", item="  Rough works  "),
                sync_summary=False,
            )
        )

        self.assertEqual(storage.get_project_calls, [10, 10])
        self.assertEqual(storage.created_project_id, 10)
        self.assertIs(storage.created_sync_summary, False)
        self.assertEqual(storage.created_values["category"], "Works")
        self.assertEqual(storage.created_values["item"], "Rough works")
        self.assertEqual(storage.created_values["plan_amount"], 500.0)
        self.assertEqual(storage.created_values["actual_amount"], 250.0)
        self.assertEqual(storage.get_entry_calls, [30])
        self.assertEqual(storage.get_document_calls, [(30, "invoice"), (30, "act")])
        self.assertEqual(set(result), {"entry", "project"})
        self.assertEqual(result["entry"]["item"], "Rough works")
        self.assertEqual(result["project"]["planned_total"], 500.0)

    async def test_missing_project_raises_not_found_without_create(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(initial_project=None, created_entry=_ledger_entry_row())

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await CreateProjectLedgerEntryUseCase(storage).execute(
                CreateProjectLedgerEntryCommand(project_id=404, payload=_ledger_payload())
            )

        self.assertEqual(storage.get_project_calls, [404])
        self.assertIsNone(storage.created_values)

    async def test_validation_error_raises_application_validation_error_without_create(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(
            initial_project=_project_row(id=10),
            created_entry=_ledger_entry_row(),
        )

        with self.assertRaisesRegex(ValidationError, "Plan amount cannot be negative"):
            await CreateProjectLedgerEntryUseCase(storage).execute(
                CreateProjectLedgerEntryCommand(project_id=10, payload=_ledger_payload(plan_amount=-1))
            )

        self.assertIsNone(storage.created_values)

    async def test_missing_created_entry_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(initial_project=_project_row(id=10), created_entry=None)

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry was not created"):
            await CreateProjectLedgerEntryUseCase(storage).execute(
                CreateProjectLedgerEntryCommand(project_id=10, payload=_ledger_payload())
            )

        self.assertEqual(storage.get_entry_calls, [30])

    async def test_missing_project_after_create_raises_operation_failed(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(
            initial_project=_project_row(id=10),
            created_project=None,
            created_entry=_ledger_entry_row(id=30, project_id=10),
        )

        with self.assertRaisesRegex(OperationFailedError, "Project ledger entry was not created"):
            await CreateProjectLedgerEntryUseCase(storage).execute(
                CreateProjectLedgerEntryCommand(project_id=10, payload=_ledger_payload())
            )

        self.assertEqual(storage.get_project_calls, [10, 10])

    async def test_invoice_and_act_documents_are_attached(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(
            initial_project=_project_row(id=10),
            created_entry=_ledger_entry_row(id=30, project_id=10),
            invoice_document=_ledger_document_row(id=40, ledger_entry_id=30, kind="invoice", title="Invoice"),
            act_document=_ledger_document_row(id=41, ledger_entry_id=30, kind="act", title="Act"),
        )

        result = await CreateProjectLedgerEntryUseCase(storage).execute(
            CreateProjectLedgerEntryCommand(project_id=10, payload=_ledger_payload())
        )

        self.assertEqual(result["entry"]["invoice_document"]["title"], "Invoice")
        self.assertEqual(result["entry"]["act_document"]["title"], "Act")

    async def test_default_category_status_and_counterparty_details_behavior(self) -> None:
        storage = FakeProjectLedgerEntryCreateStorage(
            initial_project=_project_row(id=10),
            created_entry=_ledger_entry_row(
                id=30,
                project_id=10,
                category="Работы",
                status="planned",
                counterparty_legal_name="ООО Склад",
            ),
        )

        result = await CreateProjectLedgerEntryUseCase(storage).execute(
            CreateProjectLedgerEntryCommand(
                project_id=10,
                payload=_ledger_payload(
                    category=" ",
                    status="unknown",
                    counterparty_details=_counterparty_details(legalName="ООО Склад"),
                ),
            )
        )

        self.assertEqual(storage.created_values["category"], "Работы")
        self.assertEqual(storage.created_values["status"], "planned")
        self.assertEqual(storage.created_values["counterparty_legal_name"], "ООО Склад")
        self.assertEqual(result["entry"]["counterparty_details"]["legalName"], "ООО Склад")
