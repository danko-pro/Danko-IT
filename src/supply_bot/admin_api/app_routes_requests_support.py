from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import HTTPException

from supply_bot.admin_api.app_helpers import _parse_hhmm
from supply_bot.domain.request_lifecycle import (
    ADMIN_REQUEST_STATUSES,
    RequestLifecycleError,
    normalize_request_status as normalize_lifecycle_status,
)

ALLOWED_REQUEST_STATUSES = ADMIN_REQUEST_STATUSES


def clamp_route_limit(limit: int, *, maximum: int = 100) -> int:
    return max(1, min(limit, maximum))


def normalize_request_status(value: str) -> str:
    try:
        return normalize_lifecycle_status(value, allowed=ALLOWED_REQUEST_STATUSES)
    except RequestLifecycleError as exc:
        raise HTTPException(status_code=400, detail="Unsupported status") from exc


def normalize_request_delivery(
    delivery_date: str | None,
    delivery_time: str | None,
) -> tuple[str | None, str | None]:
    normalized_date = delivery_date.strip() if delivery_date and delivery_date.strip() else None
    normalized_time = delivery_time.strip() if delivery_time and delivery_time.strip() else None

    if normalized_date is not None:
        try:
            normalized_date = date.fromisoformat(normalized_date).isoformat()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid delivery date format") from exc

    if normalized_time is not None:
        normalized_time = _parse_hhmm(normalized_time)

    return normalized_date, normalized_time


def normalize_positive_number(value: float | None, *, detail: str) -> float | None:
    if value is None:
        return None
    normalized = float(value)
    if normalized <= 0:
        raise HTTPException(status_code=400, detail=detail)
    return normalized


def build_request_item_create_values(payload) -> dict[str, Any]:
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Item title is required")

    return {
        "family_id": None,
        "variant_id": None,
        "sku_id": None,
        "raw_name": title,
        "normalized_name": title,
        "quantity": normalize_positive_number(payload.quantity, detail="Item quantity must be positive"),
        "unit": payload.unit.strip() if payload.unit and payload.unit.strip() else None,
        "thickness_mm": normalize_positive_number(payload.thickness_mm, detail="Item dimensions must be positive"),
        "length_mm": normalize_positive_number(payload.length_mm, detail="Item dimensions must be positive"),
        "width_mm": normalize_positive_number(payload.width_mm, detail="Item dimensions must be positive"),
        "note": payload.note.strip() if payload.note and payload.note.strip() else None,
    }


def build_request_item_update_values(payload) -> dict[str, Any]:
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Item title is required")

    fields: dict[str, Any] = {
        "raw_name": title,
        "normalized_name": title,
        "quantity": normalize_positive_number(payload.quantity, detail="Item quantity must be positive"),
        "unit": payload.unit.strip() if payload.unit and payload.unit.strip() else None,
        "thickness_mm": normalize_positive_number(payload.thickness_mm, detail="Item dimensions must be positive"),
        "length_mm": normalize_positive_number(payload.length_mm, detail="Item dimensions must be positive"),
        "width_mm": normalize_positive_number(payload.width_mm, detail="Item dimensions must be positive"),
        "note": payload.note.strip() if payload.note and payload.note.strip() else None,
    }
    if payload.detach_catalog:
        fields.update({"family_id": None, "variant_id": None, "sku_id": None})
    return fields
