from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class DeleteEstimateRoomCommand:
    room_id: int


class EstimateRoomDeleteStorage(Protocol):
    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None: ...

    async def delete_estimate_room(self, room_id: int) -> None: ...


class DeleteEstimateRoomUseCase:
    """Сценарий удаления помещения расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateRoomDeleteStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteEstimateRoomCommand) -> int:
        room = await self._storage.get_estimate_room(command.room_id)
        if not room:
            raise ValueError("Calculator room not found")

        project_id = int(room["project_id"])
        await self._storage.delete_estimate_room(command.room_id)
        return project_id
