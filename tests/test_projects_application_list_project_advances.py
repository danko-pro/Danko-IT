from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.list_project_advances import ListProjectAdvancesCommand, ListProjectAdvancesUseCase
from tests.test_projects_application_list_projects import _project_row


def _advance_row(**overrides: object) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": 20,
        "project_id": 10,
        "title": "Advance",
        "amount": 1500,
        "date": "2026-05-10",
        "status": "paid",
        "created_at": "2026-05-10T10:00:00",
        "updated_at": "2026-05-10T11:00:00",
    }
    row.update(overrides)
    return row


class FakeProjectAdvancesListStorage:
    def __init__(
        self,
        *,
        project: Mapping[str, Any] | None,
        advances: list[Mapping[str, Any]] | None = None,
    ) -> None:
        self.project = project
        self.advances = advances or []
        self.get_project_calls: list[int] = []
        self.list_project_advances_calls: list[int] = []

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        return self.project

    async def list_project_advances(self, project_id: int) -> list[Mapping[str, Any]]:
        self.list_project_advances_calls.append(project_id)
        return self.advances


class ListProjectAdvancesUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_project_exists_returns_existing_advance_payload_shape(self) -> None:
        storage = FakeProjectAdvancesListStorage(project=_project_row(id=10), advances=[_advance_row()])

        result = await ListProjectAdvancesUseCase(storage).execute(ListProjectAdvancesCommand(project_id=10))

        self.assertEqual(storage.get_project_calls, [10])
        self.assertEqual(storage.list_project_advances_calls, [10])
        self.assertEqual(
            result,
            [
                {
                    "id": 20,
                    "project_id": 10,
                    "title": "Advance",
                    "amount": 1500.0,
                    "date": "2026-05-10",
                    "status": "paid",
                    "created_at": "2026-05-10T10:00:00",
                    "updated_at": "2026-05-10T11:00:00",
                }
            ],
        )

    async def test_missing_project_raises_not_found_without_listing_advances(self) -> None:
        storage = FakeProjectAdvancesListStorage(project=None, advances=[_advance_row()])

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await ListProjectAdvancesUseCase(storage).execute(ListProjectAdvancesCommand(project_id=404))

        self.assertEqual(storage.get_project_calls, [404])
        self.assertEqual(storage.list_project_advances_calls, [])

    async def test_empty_advances_returns_empty_list(self) -> None:
        storage = FakeProjectAdvancesListStorage(project=_project_row(id=10), advances=[])

        result = await ListProjectAdvancesUseCase(storage).execute(ListProjectAdvancesCommand(project_id=10))

        self.assertEqual(result, [])
