from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class UpdateEstimateRoomFloorSectionCommand:
    length_m: float | int | None
    width_m: float | int | None


@dataclass(frozen=True)
class UpdateEstimateRoomOpeningCommand:
    opening_type: str
    width_m: float | int | None
    height_m: float | int | None
    quantity: float | int | None
    area_m2: float | int | None
    note: str | None


@dataclass(frozen=True)
class UpdateEstimateRoomCommand:
    room_id: int
    name: str | None
    ceiling_height_m: float | int
    manual_floor_area_m2: float | int | None
    auto_perimeter_calc: bool
    perimeter_factor: float | int
    note: str | None
    walls_m: list[float | int | None]
    floor_sections: list[UpdateEstimateRoomFloorSectionCommand]
    openings: list[UpdateEstimateRoomOpeningCommand]


class EstimateRoomUpdateStorage(Protocol):
    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_room(
        self,
        room_id: int,
        *,
        name: str,
        ceiling_height_m: float,
        manual_floor_area_m2: float | int | None,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
        note: str | None,
    ) -> None: ...

    async def replace_estimate_room_walls(self, room_id: int, walls_m: list[float]) -> None: ...

    async def replace_estimate_room_floor_sections(
        self,
        room_id: int,
        sections: list[dict[str, float]],
    ) -> None: ...

    async def replace_estimate_room_openings(
        self,
        room_id: int,
        openings: list[dict[str, object]],
    ) -> None: ...


class UpdateEstimateRoomUseCase:
    """Сценарий обновления помещения расчета без привязки к HTTP-слою."""

    def __init__(self, storage: EstimateRoomUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateEstimateRoomCommand) -> int:
        room = await self._storage.get_estimate_room(command.room_id)
        if not room:
            raise ValueError("Calculator room not found")

        name = self._normalize_required_name(command.name)
        manual_floor_area_m2 = command.manual_floor_area_m2
        if manual_floor_area_m2 is not None and manual_floor_area_m2 < 0:
            raise ValueError("Floor area cannot be negative")

        await self._storage.update_estimate_room(
            command.room_id,
            name=name,
            ceiling_height_m=self._clamp_minimum(command.ceiling_height_m, 0.1),
            manual_floor_area_m2=manual_floor_area_m2,
            auto_perimeter_calc=command.auto_perimeter_calc,
            perimeter_factor=self._clamp_minimum(command.perimeter_factor, 1.0),
            note=self._normalize_optional_text(command.note),
        )
        await self._storage.replace_estimate_room_walls(
            command.room_id,
            [float(value) for value in command.walls_m if value and value > 0],
        )
        await self._storage.replace_estimate_room_floor_sections(
            command.room_id,
            [
                {
                    "length_m": self._clamp_non_negative(section.length_m or 0.0),
                    "width_m": self._clamp_non_negative(section.width_m or 0.0),
                }
                for section in command.floor_sections
            ],
        )
        await self._storage.replace_estimate_room_openings(
            command.room_id,
            [
                {
                    "opening_type": section.opening_type,
                    "width_m": self._clamp_optional_non_negative(section.width_m),
                    "height_m": self._clamp_optional_non_negative(section.height_m),
                    "quantity": self._clamp_optional_non_negative(section.quantity),
                    "area_m2": self._clamp_optional_non_negative(section.area_m2),
                    "note": section.note,
                }
                for section in command.openings
            ],
        )
        return command.room_id

    @staticmethod
    def _normalize_required_name(value: str | None) -> str:
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError("Room name is required")
        return normalized

    @staticmethod
    def _normalize_optional_text(value: str | None) -> str | None:
        normalized = (value or "").strip()
        return normalized or None

    @staticmethod
    def _clamp_minimum(value: float | int, minimum: float) -> float:
        return max(float(value), minimum)

    @staticmethod
    def _clamp_non_negative(value: float | int) -> float:
        return max(float(value), 0.0)

    @classmethod
    def _clamp_optional_non_negative(cls, value: float | int | None) -> float | None:
        if value is None:
            return None
        return cls._clamp_non_negative(value)
