from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.read_models import build_project_read_payload
from supply_bot.projects.domain.common import ProjectValidationError
from supply_bot.projects.domain.project import build_project_update_values


@dataclass(frozen=True)
class UpdateProjectCommand:
    project_id: int
    payload_data: Mapping[str, Any]


class ProjectUpdateStorage(Protocol):
    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...

    async def get_estimate_project(self, estimate_project_id: int) -> Mapping[str, Any] | None: ...

    async def update_project(self, project_id: int, **updates: Any) -> object: ...


class UpdateProjectUseCase:
    def __init__(self, storage: ProjectUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateProjectCommand) -> dict[str, Any]:
        current = await self._storage.get_project(command.project_id)
        if not current:
            raise NotFoundError("Project not found")

        payload_data = dict(command.payload_data)
        if not payload_data:
            return build_project_read_payload(current)

        estimate_project_id = payload_data.get("estimate_project_id")
        if "estimate_project_id" in payload_data and estimate_project_id is not None:
            estimate_project = await self._storage.get_estimate_project(int(estimate_project_id))
            if not estimate_project:
                raise NotFoundError("Linked calculator project not found")

        try:
            updates = build_project_update_values(payload_data)
        except ProjectValidationError as exc:
            raise ValidationError(str(exc)) from exc

        await self._storage.update_project(command.project_id, **updates)
        project = await self._storage.get_project(command.project_id)
        if not project:
            raise OperationFailedError("Project update failed")
        return build_project_read_payload(project)
