from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError


@dataclass(frozen=True)
class DeleteProjectCommand:
    project_id: int


class ProjectDeleteStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def delete_project(self, project_id: int) -> object: ...


class DeleteProjectUseCase:
    def __init__(self, storage: ProjectDeleteStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteProjectCommand) -> dict[str, object]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        await self._storage.delete_project(command.project_id)
        return {"deleted": True, "project_id": command.project_id}
