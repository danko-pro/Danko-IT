from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.get_project_detail import GetProjectDetailCommand, GetProjectDetailUseCase
from tests.test_projects_application_list_projects import _project_row


class FakeProjectDetailStorage:
    def __init__(self, project: dict[str, Any] | None, ledger_entries: list[dict[str, Any]] | None = None) -> None:
        self.project = project
        self.ledger_entries = ledger_entries or []
        self.requested_project_id: int | None = None
        self.requested_ledger_project_id: int | None = None

    async def get_project(self, project_id: int) -> dict[str, Any] | None:
        self.requested_project_id = project_id
        return self.project

    async def list_project_ledger_entries(self, project_id: int) -> list[dict[str, Any]]:
        self.requested_ledger_project_id = project_id
        return self.ledger_entries


class GetProjectDetailUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_project_payload_with_finance_summary_and_existing_fields(self) -> None:
        storage = FakeProjectDetailStorage(
            _project_row(
                id=15,
                estimate_project_id=7,
                estimate_project_name="Calc",
                received_total=100000,
            ),
            ledger_entries=[
                {
                    "status": "planned",
                    "category": "",
                    "plan_amount": 25000,
                    "actual_amount": 0,
                }
            ],
        )

        result = await GetProjectDetailUseCase(storage).execute(GetProjectDetailCommand(project_id=15))

        self.assertEqual(storage.requested_project_id, 15)
        self.assertEqual(storage.requested_ledger_project_id, 15)
        self.assertEqual(result["id"], 15)
        self.assertEqual(result["estimate_project_id"], 7)
        self.assertEqual(result["estimate_project_name"], "Calc")
        self.assertEqual(result["received_total"], 100000.0)
        self.assertEqual(result["planned_total"], 4000.0)
        self.assertEqual(result["finance_summary"]["planned_expense_total"], 25000.0)
        self.assertEqual(result["finance_summary"]["available_after_plan"], 75000.0)
        self.assertEqual(set(result), set(await ListShapeKeys.reference_keys()))

    async def test_missing_project_raises_not_found(self) -> None:
        storage = FakeProjectDetailStorage(None)

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await GetProjectDetailUseCase(storage).execute(GetProjectDetailCommand(project_id=404))
        self.assertIsNone(storage.requested_ledger_project_id)


class ListShapeKeys:
    @staticmethod
    async def reference_keys() -> dict[str, object]:
        return await GetProjectDetailUseCase(FakeProjectDetailStorage(_project_row())).execute(
            GetProjectDetailCommand(project_id=10)
        )
