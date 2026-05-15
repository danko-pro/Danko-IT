from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class GetEstimateRoomCommand:
    room_id: int


class EstimateRoomGetStorage(Protocol):
    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None: ...


class GetEstimateRoomUseCase:
    """Сценарий чтения помещения расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateRoomGetStorage) -> None:
        self._storage = storage

    async def execute(self, command: GetEstimateRoomCommand) -> dict[str, Any]:
        room = await self._storage.get_estimate_room(command.room_id)
        if not room:
            raise ValueError("Calculator room not found")
        return room
