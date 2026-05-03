from __future__ import annotations

import json
from typing import Any, Awaitable, Callable, Mapping, Sequence, TypeVar

from fastapi import HTTPException, Request

from supply_bot.admin_api.calculator_payloads import _estimate_project_payload, _estimate_room_detail
from supply_bot.admin_api.deps import get_storage
from supply_bot.storage import BotStorage

_T = TypeVar("_T")


def get_calculator_route_storage(request: Request) -> BotStorage:
    return get_storage(request)


def normalize_optional_text(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def require_non_empty_text(value: str | None, *, detail: str) -> str:
    normalized = normalize_optional_text(value)
    if not normalized:
        raise HTTPException(status_code=400, detail=detail)
    return normalized


def clamp_non_negative(value: float | int | None) -> float:
    return max(0.0, float(value or 0.0))


def clamp_minimum(value: float | int, minimum: float) -> float:
    return max(float(minimum), float(value))


def catalog_consumables_to_json(items: Sequence[Any]) -> str:
    return json.dumps(
        [
            {
                "title": str(getattr(item, "title", "")).strip(),
                "consumption_per_m2": clamp_non_negative(getattr(item, "consumption_per_m2", 0)),
                "unit": str(getattr(item, "unit", "")).strip() or "шт",
                "price_per_unit": clamp_non_negative(getattr(item, "price_per_unit", 0)),
            }
            for item in items
            if str(getattr(item, "title", "")).strip()
        ],
        ensure_ascii=False,
    )


def require_positive_number(value: float | int | None, *, detail: str) -> float:
    if value is None or float(value) <= 0:
        raise HTTPException(status_code=400, detail=detail)
    return float(value)


async def require_estimate_project(storage_obj: BotStorage, project_id: int) -> dict[str, Any]:
    project = await storage_obj.get_estimate_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Calculator project not found")
    return project


async def require_estimate_room(storage_obj: BotStorage, room_id: int) -> dict[str, Any]:
    room = await storage_obj.get_estimate_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Calculator room not found")
    return room


async def load_estimate_project_payload(
    storage_obj: BotStorage,
    project_id: int,
    *,
    detail: str,
) -> dict[str, Any]:
    project = await storage_obj.get_estimate_project(project_id)
    if not project:
        raise HTTPException(status_code=500, detail=detail)
    return await _estimate_project_payload(storage_obj, project)


async def load_estimate_room_detail(
    storage_obj: BotStorage,
    room_id: int,
    *,
    detail: str,
) -> dict[str, Any]:
    room = await storage_obj.get_estimate_room(room_id)
    if not room:
        raise HTTPException(status_code=500, detail=detail)
    return await _estimate_room_detail(storage_obj, room)


async def load_created_catalog_item(
    list_loader: Callable[[], Awaitable[list[dict[str, Any]]]],
    *,
    created_id: int,
    detail: str,
) -> dict[str, Any]:
    items = await list_loader()
    created = next((item for item in items if int(item["id"]) == created_id), None)
    if not created:
        raise HTTPException(status_code=500, detail=detail)
    return created


def find_catalog_item(
    items: Sequence[Mapping[str, Any]],
    *,
    item_id: int | None,
    detail: str,
) -> Mapping[str, Any] | None:
    if item_id is None:
        return None
    item = next((candidate for candidate in items if int(candidate["id"]) == int(item_id)), None)
    if not item:
        raise HTTPException(status_code=404, detail=detail)
    return item


async def resolve_estimate_project_id_for_door(
    storage_obj: BotStorage,
    door_id: int,
    *,
    detail: str,
) -> int:
    async with storage_obj.connection() as db:
        cursor = await db.execute("SELECT project_id FROM estimate_project_doors WHERE id = ?", (door_id,))
        row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=500, detail=detail)
    return int(row["project_id"])
