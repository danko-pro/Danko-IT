from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.projects.application.read_models import build_project_read_payload
from supply_bot.projects.domain.common import ProjectValidationError, build_default_project_code
from supply_bot.projects.domain.project import build_project_create_values


@dataclass(frozen=True)
class CreateProjectCommand:
    payload: Any


class ProjectCreateStorage(Protocol):
    async def get_estimate_project(self, estimate_project_id: int) -> Mapping[str, Any] | None: ...

    async def count_projects(self) -> int: ...

    async def create_project(self, **data: Any) -> int: ...

    async def get_project(self, project_id: int) -> Mapping[str, Any] | None: ...


class CreateProjectUseCase:
    def __init__(self, storage: ProjectCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateProjectCommand) -> dict[str, Any]:
        payload = command.payload
        estimate_project = None
        estimate_project_id = getattr(payload, "estimate_project_id", None)
        if estimate_project_id is not None:
            estimate_project = await self._storage.get_estimate_project(estimate_project_id)
            if not estimate_project:
                raise NotFoundError("Linked calculator project not found")

        project_count = await self._storage.count_projects()
        try:
            project_values = build_project_create_values(
                payload,
                default_code=build_default_project_code(project_count + 1),
                default_name=str(estimate_project["name"]) if estimate_project else None,
            )
        except ProjectValidationError as exc:
            raise ValidationError(str(exc)) from exc

        project_id = await self._storage.create_project(**project_values)
        project = await self._storage.get_project(project_id)
        if not project:
            raise OperationFailedError("Project was not created")
        return build_project_read_payload(project)
