from __future__ import annotations

from typing import Any, Protocol


class EstimateProjectsListStorage(Protocol):
    async def list_estimate_projects(self) -> list[dict[str, Any]]: ...


class ListEstimateProjectsUseCase:
    """Сценарий чтения списка проектов расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateProjectsListStorage) -> None:
        self._storage = storage

    async def execute(self) -> list[dict[str, Any]]:
        return await self._storage.list_estimate_projects()
