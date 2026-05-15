from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CreateEstimateProjectCommand:
    name: str | None
    note: str | None
    group_chat_id: int | None


class EstimateProjectCreateStorage(Protocol):
    async def create_estimate_project(
        self,
        *,
        name: str,
        note: str | None,
        group_chat_id: int | None,
    ) -> int: ...


class CreateEstimateProjectUseCase:
    """Сценарий создания проекта расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateProjectCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateEstimateProjectCommand) -> int:
        name = self._normalize_required_name(command.name)
        note = self._normalize_optional_text(command.note)
        return await self._storage.create_estimate_project(
            name=name,
            note=note,
            group_chat_id=command.group_chat_id,
        )

    @staticmethod
    def _normalize_required_name(value: str | None) -> str:
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError("Project name is required")
        return normalized

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        normalized = (value or "").strip()
        return normalized or None
