from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError
from supply_bot.estimates.application.shared import clamp_minimum, normalize_room_name_or_fallback


@dataclass(frozen=True)
class CreateEstimateRoomCommand:
    project_id: int
    name: str | None
    ceiling_height_m: float | int
    auto_perimeter_calc: bool
    perimeter_factor: float | int


class EstimateRoomCreateStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]: ...

    async def create_estimate_room(
        self,
        *,
        project_id: int,
        name: str,
        ceiling_height_m: float,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
    ) -> int: ...


class CreateEstimateRoomUseCase:
    """Сценарий создания помещения расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateRoomCreateStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateEstimateRoomCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise NotFoundError("Calculator project not found")

        existing_rooms = await self._storage.list_estimate_rooms(command.project_id)
        name = normalize_room_name_or_fallback(command.name, fallback_index=len(existing_rooms) + 1)
        ceiling_height_m = clamp_minimum(command.ceiling_height_m, 0.1)
        perimeter_factor = clamp_minimum(command.perimeter_factor, 1.0)

        return await self._storage.create_estimate_room(
            project_id=command.project_id,
            name=name,
            ceiling_height_m=ceiling_height_m,
            auto_perimeter_calc=command.auto_perimeter_calc,
            perimeter_factor=perimeter_factor,
        )
