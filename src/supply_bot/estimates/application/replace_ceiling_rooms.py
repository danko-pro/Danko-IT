from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import normalize_optional_text, optional_non_negative


@dataclass(frozen=True)
class ReplaceCeilingRoomCommand:
    room_id: object
    default_catalog_item_id: object
    is_enabled: object
    ceiling_area_m2: object
    area_source: object
    perimeter_m: object
    perimeter_source: object
    package_code_snapshot: object
    note: object
    sort_order: object


@dataclass(frozen=True)
class ReplaceCeilingRoomsCommand:
    project_id: int
    rooms: list[ReplaceCeilingRoomCommand]


class CeilingRoomsReplaceStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]: ...

    async def list_estimate_ceiling_catalog_items(self) -> list[dict[str, Any]]: ...

    async def replace_estimate_ceiling_rooms(self, project_id: int, rows: list[dict[str, object]]) -> object: ...


class ReplaceCeilingRoomsUseCase:
    def __init__(self, storage: CeilingRoomsReplaceStorage) -> None:
        self._storage = storage

    async def execute(self, command: ReplaceCeilingRoomsCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise NotFoundError("Calculator project not found")

        room_ids = {int(room["id"]) for room in await self._storage.list_estimate_rooms(command.project_id)}
        catalog_ids = {int(item["id"]) for item in await self._storage.list_estimate_ceiling_catalog_items()}
        rows: list[dict[str, object]] = []
        for index, room_payload in enumerate(command.rooms, start=1):
            room_id = _payload_int(room_payload.room_id, error_message="Unknown ceiling room selected")
            if room_id not in room_ids:
                raise ValidationError("Unknown ceiling room selected")
            catalog_item_id = _optional_payload_int(
                room_payload.default_catalog_item_id,
                error_message="Unknown ceiling catalog item selected",
            )
            if catalog_item_id is not None and catalog_item_id not in catalog_ids:
                raise ValidationError("Unknown ceiling catalog item selected")
            rows.append(
                {
                    "room_id": room_id,
                    "default_catalog_item_id": catalog_item_id,
                    "is_enabled": bool(room_payload.is_enabled),
                    "ceiling_area_m2": _optional_non_negative(room_payload.ceiling_area_m2),
                    "area_source": _normalize_optional_payload_text(room_payload.area_source) or "room_area",
                    "perimeter_m": _optional_non_negative(room_payload.perimeter_m),
                    "perimeter_source": _normalize_optional_payload_text(room_payload.perimeter_source)
                    or "room_perimeter",
                    "package_code_snapshot": _normalize_optional_payload_text(room_payload.package_code_snapshot),
                    "note": _normalize_optional_payload_text(room_payload.note),
                    "sort_order": _payload_int(room_payload.sort_order or index * 10),
                }
            )
        await self._storage.replace_estimate_ceiling_rooms(command.project_id, rows)
        return command.project_id


def _normalize_optional_payload_text(value: object) -> str | None:
    return normalize_optional_text(str(value or ""))


def _payload_int(value: object, *, error_message: str | None = None) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(error_message or str(exc)) from exc


def _optional_payload_int(value: object, *, error_message: str) -> int | None:
    if value is None:
        return None
    return _payload_int(value, error_message=error_message)


def _optional_non_negative(value: object) -> float | None:
    try:
        return optional_non_negative(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError(str(exc)) from exc
