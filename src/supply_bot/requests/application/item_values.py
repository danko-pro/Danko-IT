from __future__ import annotations

from dataclasses import dataclass

from supply_bot.application.errors import ValidationError


@dataclass(frozen=True, slots=True)
class RequestItemValuesCommand:
    title: str | None
    quantity: float | int | None
    unit: str | None
    thickness_mm: float | int | None
    length_mm: float | int | None
    width_mm: float | int | None
    note: str | None


@dataclass(frozen=True, slots=True)
class RequestItemUpdateValuesCommand(RequestItemValuesCommand):
    detach_catalog: bool


def build_request_item_create_values(command: RequestItemValuesCommand) -> dict[str, object]:
    title = _normalize_required_title(command.title)
    return {
        "family_id": None,
        "variant_id": None,
        "sku_id": None,
        "raw_name": title,
        "normalized_name": title,
        "quantity": _normalize_positive_number(command.quantity, detail="Item quantity must be positive"),
        "unit": _normalize_optional_text(command.unit),
        "thickness_mm": _normalize_positive_number(command.thickness_mm, detail="Item dimensions must be positive"),
        "length_mm": _normalize_positive_number(command.length_mm, detail="Item dimensions must be positive"),
        "width_mm": _normalize_positive_number(command.width_mm, detail="Item dimensions must be positive"),
        "note": _normalize_optional_text(command.note),
    }


def build_request_item_update_values(command: RequestItemUpdateValuesCommand) -> dict[str, object]:
    title = _normalize_required_title(command.title)
    fields: dict[str, object] = {
        "raw_name": title,
        "normalized_name": title,
        "quantity": _normalize_positive_number(command.quantity, detail="Item quantity must be positive"),
        "unit": _normalize_optional_text(command.unit),
        "thickness_mm": _normalize_positive_number(command.thickness_mm, detail="Item dimensions must be positive"),
        "length_mm": _normalize_positive_number(command.length_mm, detail="Item dimensions must be positive"),
        "width_mm": _normalize_positive_number(command.width_mm, detail="Item dimensions must be positive"),
        "note": _normalize_optional_text(command.note),
    }
    if command.detach_catalog:
        fields.update({"family_id": None, "variant_id": None, "sku_id": None})
    return fields


def _normalize_required_title(value: str | None) -> str:
    title = (value or "").strip()
    if not title:
        raise ValidationError("Item title is required")
    return title


def _normalize_optional_text(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None


def _normalize_positive_number(value: float | int | None, *, detail: str) -> float | None:
    if value is None:
        return None
    normalized = float(value)
    if normalized <= 0:
        raise ValidationError(detail)
    return normalized
