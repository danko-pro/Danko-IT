from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.get_project_detail import GetProjectDetailCommand, GetProjectDetailUseCase
from tests.test_projects_application_list_projects import _project_row


class FakeProjectDetailStorage:
    def __init__(self, project: dict[str, Any] | None) -> None:
        self.project = project
        self.requested_project_id: int | None = None

    async def get_project(self, project_id: int) -> dict[str, Any] | None:
        self.requested_project_id = project_id
        return self.project


class GetProjectDetailUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_returns_project_payload_with_existing_response_shape(self) -> None:
        storage = FakeProjectDetailStorage(_project_row(id=15, estimate_project_id=7, estimate_project_name="Calc"))

        result = await GetProjectDetailUseCase(storage).execute(GetProjectDetailCommand(project_id=15))

        self.assertEqual(storage.requested_project_id, 15)
        self.assertEqual(result["id"], 15)
        self.assertEqual(result["estimate_project_id"], 7)
        self.assertEqual(result["estimate_project_name"], "Calc")
        self.assertEqual(set(result), set(await ListShapeKeys.reference_keys()))

    async def test_missing_project_raises_not_found(self) -> None:
        storage = FakeProjectDetailStorage(None)

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await GetProjectDetailUseCase(storage).execute(GetProjectDetailCommand(project_id=404))


class ListShapeKeys:
    @staticmethod
    async def reference_keys() -> dict[str, object]:
        return await GetProjectDetailUseCase(FakeProjectDetailStorage(_project_row())).execute(
            GetProjectDetailCommand(project_id=10)
        )
