from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError
from supply_bot.projects.application.read_models import build_project_advance_delete_response_payload


@dataclass(frozen=True)
class DeleteProjectAdvanceCommand:
    project_id: int
    advance_id: int


class ProjectAdvanceDeleteStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def get_project_advance(self, advance_id: int) -> Mapping[str, Any] | None: ...

    async def delete_project_advance(self, advance_id: int) -> object: ...


class DeleteProjectAdvanceUseCase:
    def __init__(self, storage: ProjectAdvanceDeleteStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteProjectAdvanceCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        advance = await self._storage.get_project_advance(command.advance_id)
        if not advance or int(advance["project_id"]) != command.project_id:
            raise NotFoundError("Project advance not found")

        deleted_advance = await self._storage.delete_project_advance(command.advance_id)
        if not deleted_advance:
            raise OperationFailedError("Project advance deletion failed")

        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project advance deletion failed")

        return build_project_advance_delete_response_payload(
            advance_id=command.advance_id,
            project=project,
        )
