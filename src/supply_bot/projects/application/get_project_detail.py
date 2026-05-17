from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.read_models import build_project_read_payload


@dataclass(frozen=True)
class GetProjectDetailCommand:
    project_id: int


class ProjectDetailStorage(Protocol):
    async def get_project(self, project_id: int) -> dict[str, Any] | None: ...


class GetProjectDetailUseCase:
    def __init__(self, storage: ProjectDetailStorage) -> None:
        self._storage = storage

    async def execute(self, command: GetProjectDetailCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")
        return build_project_read_payload(project)
