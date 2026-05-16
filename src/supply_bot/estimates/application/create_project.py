from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.shared import normalize_optional_text, normalize_required_text


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
        try:
            name = normalize_required_text(command.name, error_message="Project name is required")
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

        note = normalize_optional_text(command.note)
        return await self._storage.create_estimate_project(
            name=name,
            note=note,
            group_chat_id=command.group_chat_id,
        )
