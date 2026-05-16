from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text


@dataclass(frozen=True)
class UpdateWallFinishRoomZoneCommand:
    covering_id: int | None
    preparation_id: int | None
    layout_id: int | None
    area_m2: float | int | None
    note: str | None


@dataclass(frozen=True)
class UpdateWallFinishRoomCommand:
    room_id: int
    selected: bool
    covering_id: int | None
    preparation_id: int | None
    layout_id: int | None
    area_m2_override: float | int | None
    note: str | None
    zones: list[UpdateWallFinishRoomZoneCommand]


@dataclass(frozen=True)
class UpdateWallFinishCommand:
    project_id: int
    rooms_snapshot: list[dict[str, object]]
    include_preparation: bool
    include_demolition: bool
    demolition_price_per_m2: float | int
    rooms: list[UpdateWallFinishRoomCommand]


class WallFinishUpdateStorage(Protocol):
    async def list_estimate_wall_finish_coverings(self) -> list[dict[str, Any]]: ...

    async def list_estimate_wall_finish_preparations(self) -> list[dict[str, Any]]: ...

    async def list_estimate_wall_finish_layouts(self) -> list[dict[str, Any]]: ...

    async def update_estimate_wall_finish_config(
        self,
        project_id: int,
        *,
        include_preparation: bool,
        include_demolition: bool,
        demolition_price_per_m2: float,
    ) -> None: ...

    async def replace_estimate_wall_finish_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None: ...

    async def replace_estimate_wall_finish_room_zones(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None: ...


class UpdateWallFinishUseCase:
    """Сценарий обновления отделки стен без привязки к HTTP-слою."""

    def __init__(self, storage: WallFinishUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateWallFinishCommand) -> int:
        covering_ids = {int(item["id"]) for item in await self._storage.list_estimate_wall_finish_coverings()}
        preparation_ids = {int(item["id"]) for item in await self._storage.list_estimate_wall_finish_preparations()}
        layout_ids = {int(item["id"]) for item in await self._storage.list_estimate_wall_finish_layouts()}

        rows, zone_rows = _build_wall_finish_rows(
            command,
            covering_ids=covering_ids,
            preparation_ids=preparation_ids,
            layout_ids=layout_ids,
        )
        await self._storage.update_estimate_wall_finish_config(
            command.project_id,
            include_preparation=command.include_preparation,
            include_demolition=command.include_demolition,
            demolition_price_per_m2=clamp_non_negative(command.demolition_price_per_m2),
        )
        await self._storage.replace_estimate_wall_finish_rooms(command.project_id, rows)
        await self._storage.replace_estimate_wall_finish_room_zones(command.project_id, zone_rows)
        return command.project_id


def _build_wall_finish_rows(
    command: UpdateWallFinishCommand,
    *,
    covering_ids: set[int],
    preparation_ids: set[int],
    layout_ids: set[int],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    rooms = command.rooms_snapshot
    room_ids = {int(room["id"]) for room in rooms}
    rows: list[dict[str, object]] = []
    zone_rows: list[dict[str, object]] = []
    seen_room_ids: set[int] = set()
    for index, room_payload in enumerate(command.rooms, start=1):
        room_id = int(room_payload.room_id)
        if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
            continue
        seen_room_ids.add(room_id)
        _validate_wall_finish_catalog_ids(
            covering_id=room_payload.covering_id,
            preparation_id=room_payload.preparation_id,
            layout_id=room_payload.layout_id,
            covering_ids=covering_ids,
            preparation_ids=preparation_ids,
            layout_ids=layout_ids,
        )
        if room_payload.area_m2_override is not None and room_payload.area_m2_override < 0:
            raise ValidationError("Wall finish override cannot be negative")

        room_base_area = next(
            (float(room.get("wall_area_net_m2") or 0) for room in rooms if int(room["id"]) == room_id),
            0.0,
        )
        room_effective_area = (
            room_payload.area_m2_override if room_payload.area_m2_override is not None else room_base_area
        )
        zones_payload = [
            {
                "covering_id": zone.covering_id,
                "preparation_id": zone.preparation_id,
                "layout_id": zone.layout_id,
                "area_m2": zone.area_m2,
                "note": zone.note,
            }
            for zone in room_payload.zones
        ]
        if not zones_payload and (
            room_payload.covering_id is not None
            or room_payload.preparation_id is not None
            or room_payload.layout_id is not None
        ):
            zones_payload.append(
                {
                    "covering_id": room_payload.covering_id,
                    "preparation_id": room_payload.preparation_id,
                    "layout_id": room_payload.layout_id,
                    "area_m2": None,
                    "note": room_payload.note,
                }
            )

        zone_area_total = 0.0
        for zone_payload in zones_payload:
            _validate_wall_finish_catalog_ids(
                covering_id=zone_payload["covering_id"],
                preparation_id=zone_payload["preparation_id"],
                layout_id=zone_payload["layout_id"],
                covering_ids=covering_ids,
                preparation_ids=preparation_ids,
                layout_ids=layout_ids,
            )
            if zone_payload["area_m2"] is not None and zone_payload["area_m2"] < 0:
                raise ValidationError("Wall finish zone area cannot be negative")
            if zone_payload["area_m2"] is not None:
                zone_area_total += float(zone_payload["area_m2"])
        if zone_area_total > float(room_effective_area) + 0.0001:
            raise ValidationError("Wall finish zones cannot exceed room area")

        rows.append(
            {
                "room_id": room_id,
                "covering_id": room_payload.covering_id,
                "preparation_id": room_payload.preparation_id,
                "layout_id": room_payload.layout_id,
                "area_m2_override": room_payload.area_m2_override,
                "note": normalize_optional_text(room_payload.note),
                "sort_order": index * 10,
            }
        )
        for zone_payload in zones_payload:
            zone_rows.append(
                {
                    "room_id": room_id,
                    "covering_id": zone_payload["covering_id"],
                    "preparation_id": zone_payload["preparation_id"],
                    "layout_id": zone_payload["layout_id"],
                    "area_m2": zone_payload["area_m2"],
                    "note": normalize_optional_text(zone_payload["note"]),
                }
            )
    return rows, zone_rows


def _validate_wall_finish_catalog_ids(
    *,
    covering_id: object,
    preparation_id: object,
    layout_id: object,
    covering_ids: set[int],
    preparation_ids: set[int],
    layout_ids: set[int],
) -> None:
    if covering_id is not None and covering_id not in covering_ids:
        raise ValidationError("Unknown wall finish selected")
    if preparation_id is not None and preparation_id not in preparation_ids:
        raise ValidationError("Unknown wall preparation selected")
    if layout_id is not None and layout_id not in layout_ids:
        raise ValidationError("Unknown wall layout selected")
