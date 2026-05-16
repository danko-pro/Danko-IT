from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text


@dataclass(frozen=True)
class UpdateWarmFloorMaterialItemCommand:
    title: str
    unit: str
    quantity: float | int
    amount: float | int


@dataclass(frozen=True)
class UpdateWarmFloorRoomCommand:
    room_id: int
    selected: bool
    area_m2_override: float | int | None
    note: str | None


@dataclass(frozen=True)
class UpdateWarmFloorCommand:
    project_id: int
    work_price_per_m2: float | int
    pipe_m_per_m2: float | int
    max_contour_area_m2: float | int
    small_zone_area_m2: float | int
    manifold_work_price: float | int
    manifold_material_price: float | int
    pump_work_price: float | int
    pump_material_price: float | int
    pipe_price_per_m: float | int
    pipe_material_title: str
    manifold_material_items: list[UpdateWarmFloorMaterialItemCommand]
    pump_material_items: list[UpdateWarmFloorMaterialItemCommand]
    consumable_material_items: list[UpdateWarmFloorMaterialItemCommand]
    pump_rooms_threshold: int
    pump_contours_threshold: int
    rooms: list[UpdateWarmFloorRoomCommand]


class WarmFloorUpdateStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]: ...

    async def update_estimate_warm_floor_config(
        self,
        project_id: int,
        *,
        work_price_per_m2: float,
        pipe_m_per_m2: float,
        max_contour_area_m2: float,
        small_zone_area_m2: float,
        manifold_work_price: float,
        manifold_material_price: float,
        pump_work_price: float,
        pump_material_price: float,
        pipe_price_per_m: float,
        pipe_material_title: str,
        manifold_material_items_json: str,
        pump_material_items_json: str,
        consumable_material_items_json: str,
        pump_rooms_threshold: int,
        pump_contours_threshold: int,
    ) -> None: ...

    async def replace_estimate_warm_floor_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None: ...


class UpdateWarmFloorUseCase:
    """Сценарий обновления теплого пола без привязки к HTTP-слою."""

    def __init__(self, storage: WarmFloorUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateWarmFloorCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise NotFoundError("Calculator project not found")

        manifold_material_price = _effective_material_price(
            configured_price=command.manifold_material_price,
            material_items=command.manifold_material_items,
        )
        pump_material_price = _effective_material_price(
            configured_price=command.pump_material_price,
            material_items=command.pump_material_items,
        )
        self._validate_command(
            command,
            manifold_material_price=manifold_material_price,
            pump_material_price=pump_material_price,
        )
        selected_rows = await self._build_selected_rows(command)

        await self._storage.update_estimate_warm_floor_config(
            command.project_id,
            work_price_per_m2=float(command.work_price_per_m2),
            pipe_m_per_m2=float(command.pipe_m_per_m2),
            max_contour_area_m2=float(command.max_contour_area_m2),
            small_zone_area_m2=float(command.small_zone_area_m2),
            manifold_work_price=float(command.manifold_work_price),
            manifold_material_price=float(manifold_material_price),
            pump_work_price=float(command.pump_work_price),
            pump_material_price=float(pump_material_price),
            pipe_price_per_m=float(command.pipe_price_per_m),
            pipe_material_title=command.pipe_material_title.strip()
            or "Труба PEX-a 16x2 для водяного тёплого пола",
            manifold_material_items_json=json.dumps(
                [_material_item_payload(item) for item in command.manifold_material_items],
                ensure_ascii=False,
            ),
            pump_material_items_json=json.dumps(
                [_material_item_payload(item) for item in command.pump_material_items],
                ensure_ascii=False,
            ),
            consumable_material_items_json=json.dumps(
                [_material_item_payload(item) for item in command.consumable_material_items],
                ensure_ascii=False,
            ),
            pump_rooms_threshold=int(command.pump_rooms_threshold),
            pump_contours_threshold=int(command.pump_contours_threshold),
        )
        await self._storage.replace_estimate_warm_floor_rooms(command.project_id, selected_rows)
        return command.project_id

    def _validate_command(
        self,
        command: UpdateWarmFloorCommand,
        *,
        manifold_material_price: float | int,
        pump_material_price: float | int,
    ) -> None:
        if command.work_price_per_m2 < 0 or command.pipe_m_per_m2 < 0 or command.pipe_price_per_m < 0:
            raise ValidationError("Warm floor prices and consumption must be non-negative")
        if command.max_contour_area_m2 <= 0 or command.small_zone_area_m2 < 0:
            raise ValidationError("Warm floor contour and zone parameters are invalid")
        if (
            command.manifold_work_price < 0
            or manifold_material_price < 0
            or command.pump_work_price < 0
            or pump_material_price < 0
        ):
            raise ValidationError("Warm floor node prices must be non-negative")
        if command.pump_rooms_threshold < 1 or command.pump_contours_threshold < 1:
            raise ValidationError("Pump thresholds must be positive integers")

    async def _build_selected_rows(self, command: UpdateWarmFloorCommand) -> list[dict[str, object]]:
        rooms = await self._storage.list_estimate_rooms(command.project_id)
        room_ids = {int(room["id"]) for room in rooms}
        selected_rows: list[dict[str, object]] = []
        seen_room_ids: set[int] = set()
        for index, room_payload in enumerate(command.rooms, start=1):
            room_id = int(room_payload.room_id)
            if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
                continue
            seen_room_ids.add(room_id)
            area_override = room_payload.area_m2_override
            if area_override is not None and area_override < 0:
                raise ValidationError("Warm floor area override cannot be negative")
            selected_rows.append(
                {
                    "room_id": room_id,
                    "area_m2_override": area_override,
                    "note": normalize_optional_text(room_payload.note),
                    "sort_order": index * 10,
                }
            )
        return selected_rows


def _effective_material_price(
    *,
    configured_price: float | int,
    material_items: list[UpdateWarmFloorMaterialItemCommand],
) -> float | int:
    if not material_items:
        return configured_price
    return sum(clamp_non_negative(item.amount) for item in material_items)


def _material_item_payload(item: UpdateWarmFloorMaterialItemCommand) -> dict[str, object]:
    return {
        "title": item.title.strip(),
        "unit": item.unit.strip() or "компл.",
        "quantity": clamp_non_negative(item.quantity),
        "amount": clamp_non_negative(item.amount),
    }
