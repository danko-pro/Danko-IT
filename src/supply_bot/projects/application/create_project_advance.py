from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.read_models import build_project_advance_response_payload
from supply_bot.projects.domain.common import ProjectValidationError
from supply_bot.projects.domain.project import build_project_advance_create_values


@dataclass(frozen=True)
class CreateProjectAdvanceCommand:
    project_id: int
    payload: Any
    sync_totals: bool = True


class ProjectAdvanceCreateStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def create_project_advance(self, *, project_id: int, sync_totals: bool, **values: Any) -> int: ...

    async def get_project_advance(self, advance_id: int) -> Mapping[str, Any] | None: ...


class CreateProjectAdvanceUseCase:
    def __init__(self, storage: ProjectAdvanceCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateProjectAdvanceCommand) -> dict[str, Any]:
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise NotFoundError("Project not found")

        try:
            advance_values = build_project_advance_create_values(command.payload)
        except ProjectValidationError as exc:
            raise ValidationError(str(exc)) from exc

        advance_id = await self._storage.create_project_advance(
            project_id=command.project_id,
            sync_totals=command.sync_totals,
            **advance_values,
        )
        advance = await self._storage.get_project_advance(advance_id)
        if not advance:
            raise OperationFailedError("Project advance was not created")

        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project advance was not created")

        return build_project_advance_response_payload(advance=advance, project=project)
