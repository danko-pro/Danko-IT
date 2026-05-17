from __future__ import annotations

import unittest
from typing import Any, Mapping

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.delete_project import DeleteProjectCommand, DeleteProjectUseCase
from tests.test_projects_application_list_projects import _project_row


class FakeProjectDeleteStorage:
    def __init__(self, *, project: Mapping[str, Any] | None) -> None:
        self.project = project
        self.get_project_calls: list[int] = []
        self.deleted_project_id: int | None = None

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None:
        self.get_project_calls.append(project_id)
        return self.project

    async def delete_project(self, project_id: int) -> object:
        self.deleted_project_id = project_id
        return True


class DeleteProjectUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_delete_existing_project_returns_expected_payload(self) -> None:
        storage = FakeProjectDeleteStorage(project=_project_row(id=10))

        result = await DeleteProjectUseCase(storage).execute(DeleteProjectCommand(project_id=10))

        self.assertEqual(storage.get_project_calls, [10])
        self.assertEqual(storage.deleted_project_id, 10)
        self.assertEqual(result, {"deleted": True, "project_id": 10})

    async def test_missing_project_raises_not_found_without_delete(self) -> None:
        storage = FakeProjectDeleteStorage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Project not found"):
            await DeleteProjectUseCase(storage).execute(DeleteProjectCommand(project_id=404))

        self.assertEqual(storage.get_project_calls, [404])
        self.assertIsNone(storage.deleted_project_id)

    async def test_response_shape_is_stable(self) -> None:
        storage = FakeProjectDeleteStorage(project=_project_row(id=77))

        result = await DeleteProjectUseCase(storage).execute(DeleteProjectCommand(project_id=77))

        self.assertEqual(set(result), {"deleted", "project_id"})
        self.assertIs(result["deleted"], True)
        self.assertEqual(result["project_id"], 77)
