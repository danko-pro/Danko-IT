from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.estimates.application.shared import clamp_factor, normalize_optional_text


@dataclass(frozen=True)
class UpdateCeilingConfigCommand:
    project_id: int
    default_package_code: str | None
    price_factor: object
    note: str | None


class CeilingConfigUpdateStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_ceiling_config(self, project_id: int, **kwargs: object) -> object: ...


class UpdateCeilingConfigUseCase:
    def __init__(self, storage: CeilingConfigUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateCeilingConfigCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise ValueError("Calculator project not found")
        await self._storage.update_estimate_ceiling_config(
            command.project_id,
            default_package_code=normalize_optional_text(command.default_package_code),
            price_factor=clamp_factor(command.price_factor),
            note=normalize_optional_text(command.note),
        )
        return command.project_id
