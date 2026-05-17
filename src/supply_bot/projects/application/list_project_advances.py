from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.projects.application.read_models import build_project_advance_read_payload


@dataclass(frozen=True)
class ListProjectAdvancesCommand:
    project_id: int


class ProjectAdvancesListStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def list_project_advances(self, project_id: int) -> list[Mapping[str, Any]]: ...


class ListProjectAdvancesUseCase:
    def __init__(self, storage: ProjectAdvancesListStorage) -> None:
        self._storage = storage

    async def execute(self, command: ListProjectAdvancesCommand) -> list[dict[str, Any]]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        advances = await self._storage.list_project_advances(command.project_id)
        return [build_project_advance_read_payload(advance) for advance in advances]
