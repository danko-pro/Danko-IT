from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text


@dataclass(frozen=True)
class UpdateFlooringGlobalItemCommand:
    kind: str
    title: str
    mode: str
    rate: float | int
    quantity: float | int
    enabled: bool


@dataclass(frozen=True)
class UpdateFlooringRoomZoneCommand:
    covering_id: int | None
    preparation_id: int | None
    layout_id: int | None
    area_m2: float | int | None
    note: str | None


@dataclass(frozen=True)
class UpdateFlooringRoomCommand:
    room_id: int
    selected: bool
    covering_id: int | None
    preparation_id: int | None
    layout_id: int | None
    area_m2_override: float | int | None
    perimeter_m_override: float | int | None
    plinth_m_override: float | int | None
    note: str | None
    zones: list[UpdateFlooringRoomZoneCommand]


@dataclass(frozen=True)
class UpdateFlooringCommand:
    project_id: int
    include_underlay: bool
    include_plinth: bool
    include_demolition: bool
    include_preparation: bool
    default_preparation_id: int | None
    demolition_price_per_m2: float | int
    underlay_price_per_m2: float | int
    plinth_material_price_per_m: float | int
    plinth_install_price_per_m: float | int
    threshold_profile_count: int
    threshold_profile_price: float | int
    global_items: list[UpdateFlooringGlobalItemCommand]
    rooms: list[UpdateFlooringRoomCommand]


class FlooringUpdateStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]: ...

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]: ...

    async def update_estimate_flooring_config(
        self,
        project_id: int,
        *,
        include_underlay: bool,
        include_plinth: bool,
        include_demolition: bool,
        include_preparation: bool,
        default_preparation_id: int | None,
        demolition_price_per_m2: float,
        underlay_price_per_m2: float,
        plinth_material_price_per_m: float,
        plinth_install_price_per_m: float,
        threshold_profile_count: int,
        threshold_profile_price: float,
        global_items_json: str,
    ) -> None: ...

    async def replace_estimate_flooring_rooms(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None: ...

    async def replace_estimate_flooring_room_zones(
        self,
        project_id: int,
        rows: list[dict[str, object]],
    ) -> None: ...


class UpdateFlooringUseCase:
    """Сценарий обновления напольных покрытий без привязки к HTTP-слою."""

    def __init__(self, storage: FlooringUpdateStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateFlooringCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise NotFoundError("Calculator project not found")

        rooms = await self._storage.list_estimate_rooms(command.project_id)
        room_ids = {int(room["id"]) for room in rooms}
        covering_ids = {int(item["id"]) for item in await self._storage.list_estimate_flooring_coverings()}
        preparation_ids = {int(item["id"]) for item in await self._storage.list_estimate_flooring_preparations()}
        layout_ids = {int(item["id"]) for item in await self._storage.list_estimate_flooring_layouts()}
        if command.default_preparation_id is not None and command.default_preparation_id not in preparation_ids:
            raise ValidationError("Unknown floor preparation selected")

        rows, zone_rows = _build_flooring_rows(
            command,
            rooms=rooms,
            room_ids=room_ids,
            covering_ids=covering_ids,
            preparation_ids=preparation_ids,
            layout_ids=layout_ids,
        )
        await self._storage.update_estimate_flooring_config(
            command.project_id,
            include_underlay=command.include_underlay,
            include_plinth=command.include_plinth,
            include_demolition=command.include_demolition,
            include_preparation=command.include_preparation,
            default_preparation_id=command.default_preparation_id,
            demolition_price_per_m2=clamp_non_negative(command.demolition_price_per_m2),
            underlay_price_per_m2=clamp_non_negative(command.underlay_price_per_m2),
            plinth_material_price_per_m=clamp_non_negative(command.plinth_material_price_per_m),
            plinth_install_price_per_m=clamp_non_negative(command.plinth_install_price_per_m),
            threshold_profile_count=max(0, int(command.threshold_profile_count)),
            threshold_profile_price=clamp_non_negative(command.threshold_profile_price),
            global_items_json=json.dumps(_global_item_payloads(command.global_items), ensure_ascii=False),
        )
        await self._storage.replace_estimate_flooring_rooms(command.project_id, rows)
        await self._storage.replace_estimate_flooring_room_zones(command.project_id, zone_rows)
        return command.project_id


def _build_flooring_rows(
    command: UpdateFlooringCommand,
    *,
    rooms: list[dict[str, Any]],
    room_ids: set[int],
    covering_ids: set[int],
    preparation_ids: set[int],
    layout_ids: set[int],
) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    rows: list[dict[str, object]] = []
    zone_rows: list[dict[str, object]] = []
    seen_room_ids: set[int] = set()
    for index, room_payload in enumerate(command.rooms, start=1):
        room_id = int(room_payload.room_id)
        if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
            continue
        seen_room_ids.add(room_id)
        _validate_flooring_catalog_ids(
            covering_id=room_payload.covering_id,
            preparation_id=room_payload.preparation_id,
            layout_id=room_payload.layout_id,
            covering_ids=covering_ids,
            preparation_ids=preparation_ids,
            layout_ids=layout_ids,
        )
        for value in (
            room_payload.area_m2_override,
            room_payload.perimeter_m_override,
            room_payload.plinth_m_override,
        ):
            if value is not None and value < 0:
                raise ValidationError("Flooring overrides cannot be negative")

        room_base_area = next(
            (
                float(room.get("floor_area_m2") or room.get("manual_floor_area_m2") or 0)
                for room in rooms
                if int(room["id"]) == room_id
            ),
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
            _validate_flooring_catalog_ids(
                covering_id=zone_payload["covering_id"],
                preparation_id=zone_payload["preparation_id"],
                layout_id=zone_payload["layout_id"],
                covering_ids=covering_ids,
                preparation_ids=preparation_ids,
                layout_ids=layout_ids,
            )
            if zone_payload["area_m2"] is not None and zone_payload["area_m2"] < 0:
                raise ValidationError("Flooring zone area cannot be negative")
            if zone_payload["area_m2"] is not None:
                zone_area_total += float(zone_payload["area_m2"])
        if room_effective_area and zone_area_total > float(room_effective_area) + 0.0001:
            raise ValidationError("Flooring zones cannot exceed room area")

        rows.append(
            {
                "room_id": room_id,
                "covering_id": room_payload.covering_id,
                "preparation_id": room_payload.preparation_id,
                "layout_id": room_payload.layout_id,
                "area_m2_override": room_payload.area_m2_override,
                "perimeter_m_override": room_payload.perimeter_m_override,
                "plinth_m_override": room_payload.plinth_m_override,
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


def _validate_flooring_catalog_ids(
    *,
    covering_id: object,
    preparation_id: object,
    layout_id: object,
    covering_ids: set[int],
    preparation_ids: set[int],
    layout_ids: set[int],
) -> None:
    if covering_id is not None and covering_id not in covering_ids:
        raise ValidationError("Unknown floor covering selected")
    if preparation_id is not None and preparation_id not in preparation_ids:
        raise ValidationError("Unknown floor preparation selected")
    if layout_id is not None and layout_id not in layout_ids:
        raise ValidationError("Unknown floor layout selected")


def _global_item_payloads(items: list[UpdateFlooringGlobalItemCommand]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for item in items:
        title = normalize_optional_text(item.title)
        if not title:
            continue
        rows.append(
            {
                "kind": item.kind,
                "title": title,
                "mode": item.mode,
                "rate": clamp_non_negative(item.rate),
                "quantity": clamp_non_negative(item.quantity),
                "enabled": item.enabled,
            }
        )
    return rows
