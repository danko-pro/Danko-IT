from __future__ import annotations

from typing import Any, Protocol

from supply_bot.projects.application.read_models import build_project_read_payload


class ProjectsListStorage(Protocol):
    async def list_projects(self) -> list[dict[str, Any]]: ...


class ListProjectsUseCase:
    def __init__(self, storage: ProjectsListStorage) -> None:
        self._storage = storage

    async def execute(self) -> list[dict[str, Any]]:
        projects = await self._storage.list_projects()
        return [build_project_read_payload(project) for project in projects]
