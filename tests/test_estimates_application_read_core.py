from __future__ import annotations

import unittest
from typing import Any

from supply_bot.application.errors import NotFoundError
from supply_bot.estimates.application.get_project import (
    GetEstimateProjectCommand,
    GetEstimateProjectUseCase,
)
from supply_bot.estimates.application.get_room import (
    GetEstimateRoomCommand,
    GetEstimateRoomUseCase,
)
from supply_bot.estimates.application.list_projects import ListEstimateProjectsUseCase


class FakeEstimateReadStorage:
    def __init__(
        self,
        *,
        projects: list[dict[str, Any]] | None = None,
        project: dict[str, Any] | None = None,
        room: dict[str, Any] | None = None,
    ) -> None:
        self.projects = projects or []
        self.project = project
        self.room = room

    async def list_estimate_projects(self) -> list[dict[str, Any]]:
        return self.projects

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        return self.project

    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None:
        return self.room


class CalculatorReadUseCaseTests(unittest.IsolatedAsyncioTestCase):
    async def test_list_projects_returns_storage_result_as_is(self) -> None:
        projects = [{"id": 1, "name": "Project A"}]
        storage = FakeEstimateReadStorage(projects=projects)

        result = await ListEstimateProjectsUseCase(storage).execute()

        self.assertIs(result, projects)

    async def test_get_project_returns_project_as_is(self) -> None:
        project = {"id": 10, "name": "Project A"}
        storage = FakeEstimateReadStorage(project=project)

        result = await GetEstimateProjectUseCase(storage).execute(GetEstimateProjectCommand(project_id=10))

        self.assertIs(result, project)

    async def test_get_project_rejects_missing_project(self) -> None:
        storage = FakeEstimateReadStorage(project=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator project not found"):
            await GetEstimateProjectUseCase(storage).execute(GetEstimateProjectCommand(project_id=404))

    async def test_get_room_returns_room_as_is(self) -> None:
        room = {"id": 20, "name": "Room A"}
        storage = FakeEstimateReadStorage(room=room)

        result = await GetEstimateRoomUseCase(storage).execute(GetEstimateRoomCommand(room_id=20))

        self.assertIs(result, room)

    async def test_get_room_rejects_missing_room(self) -> None:
        storage = FakeEstimateReadStorage(room=None)

        with self.assertRaisesRegex(NotFoundError, "Calculator room not found"):
            await GetEstimateRoomUseCase(storage).execute(GetEstimateRoomCommand(room_id=404))
