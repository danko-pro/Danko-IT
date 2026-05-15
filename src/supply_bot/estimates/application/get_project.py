from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class GetEstimateProjectCommand:
    project_id: int


class EstimateProjectGetStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...


class GetEstimateProjectUseCase:
    """Сценарий чтения проекта расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateProjectGetStorage) -> None:
        self._storage = storage

    async def execute(self, command: GetEstimateProjectCommand) -> dict[str, Any]:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise ValueError("Calculator project not found")
        return project
