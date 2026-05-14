from __future__ import annotations

from typing import Any


def _to_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp_non_negative(value: Any, default: float = 0.0) -> float:
    return max(0.0, _to_float(value, default))


def _price_factor(value: Any) -> float:
    if value in (None, ""):
        return 1.0
    return _clamp_non_negative(value)


def _is_enabled(item: dict[str, Any]) -> bool:
    value = item.get("is_enabled", True)
    return value not in (False, 0, "0", "false", "False")


def calculate_ceiling_quantity(
    quantity_source: str | None,
    *,
    quantity: Any = None,
    room_area_m2: Any = None,
    room_perimeter_m: Any = None,
    pieces: Any = None,
) -> float:
    source = str(quantity_source or "manual")
    if source == "room_area":
        return _clamp_non_negative(room_area_m2)
    if source == "room_perimeter":
        return _clamp_non_negative(room_perimeter_m)
    if source == "pieces":
        return _clamp_non_negative(pieces if pieces not in (None, "") else quantity)
    return _clamp_non_negative(quantity)


def calculate_ceiling_item_totals(
    *,
    quantity: Any,
    work_price: Any = 0.0,
    material_price: Any = 0.0,
    equipment_price: Any = 0.0,
    consumables_price: Any = 0.0,
    price_factor: Any = 1.0,
) -> dict[str, float]:
    safe_quantity = _clamp_non_negative(quantity)
    safe_factor = _price_factor(price_factor)
    work_total = safe_quantity * _clamp_non_negative(work_price) * safe_factor
    material_total = safe_quantity * _clamp_non_negative(material_price) * safe_factor
    equipment_total = safe_quantity * _clamp_non_negative(equipment_price) * safe_factor
    consumables_total = safe_quantity * _clamp_non_negative(consumables_price) * safe_factor
    return {
        "work_total": work_total,
        "material_total": material_total,
        "equipment_total": equipment_total,
        "consumables_total": consumables_total,
        "total": work_total + material_total + equipment_total + consumables_total,
    }


def build_ceiling_project_item_from_catalog(
    catalog_item: dict[str, Any],
    *,
    quantity_source: str | None = None,
    quantity: Any = None,
    room_area_m2: Any = None,
    room_perimeter_m: Any = None,
    pieces: Any = None,
    is_enabled: bool = True,
    sort_order: int | None = None,
) -> dict[str, Any]:
    resolved_quantity_source = str(quantity_source or catalog_item.get("quantity_source") or "manual")
    resolved_quantity = calculate_ceiling_quantity(
        resolved_quantity_source,
        quantity=quantity,
        room_area_m2=room_area_m2,
        room_perimeter_m=room_perimeter_m,
        pieces=pieces,
    )
    factor_snapshot = _price_factor(catalog_item.get("price_factor"))
    totals = calculate_ceiling_item_totals(
        quantity=resolved_quantity,
        work_price=catalog_item.get("work_price"),
        material_price=catalog_item.get("material_price"),
        equipment_price=catalog_item.get("equipment_price"),
        consumables_price=catalog_item.get("consumables_price"),
        price_factor=factor_snapshot,
    )
    return {
        "source_catalog_item_id": catalog_item.get("id"),
        "source_code_snapshot": catalog_item.get("source_code") or catalog_item.get("source_key"),
        "title_snapshot": str(catalog_item.get("title") or ""),
        "category_snapshot": catalog_item.get("category"),
        "unit_snapshot": str(catalog_item.get("unit") or ""),
        "quantity": resolved_quantity,
        "quantity_source": resolved_quantity_source,
        "quantity_formula_snapshot": catalog_item.get("quantity_formula") or resolved_quantity_source,
        "work_price_snapshot": _clamp_non_negative(catalog_item.get("work_price")),
        "material_price_snapshot": _clamp_non_negative(catalog_item.get("material_price")),
        "equipment_price_snapshot": _clamp_non_negative(catalog_item.get("equipment_price")),
        "consumables_price_snapshot": _clamp_non_negative(catalog_item.get("consumables_price")),
        "price_factor_snapshot": factor_snapshot,
        "work_total": totals["work_total"],
        "material_total": totals["material_total"],
        "equipment_total": totals["equipment_total"],
        "consumables_total": totals["consumables_total"],
        "total": totals["total"],
        "note_snapshot": catalog_item.get("note"),
        "is_enabled": 1 if is_enabled else 0,
        "sort_order": int(sort_order if sort_order is not None else catalog_item.get("sort_order") or 100),
    }


def build_ceiling_summary(items: list[dict[str, Any]]) -> dict[str, float | int]:
    summary: dict[str, float | int] = {
        "items_count": len(items),
        "enabled_items_count": 0,
        "work_total": 0.0,
        "material_total": 0.0,
        "equipment_total": 0.0,
        "consumables_total": 0.0,
        "grand_total": 0.0,
    }
    for item in items:
        if not _is_enabled(item):
            continue
        summary["enabled_items_count"] = int(summary["enabled_items_count"]) + 1
        summary["work_total"] = float(summary["work_total"]) + _clamp_non_negative(item.get("work_total"))
        summary["material_total"] = float(summary["material_total"]) + _clamp_non_negative(item.get("material_total"))
        summary["equipment_total"] = float(summary["equipment_total"]) + _clamp_non_negative(
            item.get("equipment_total")
        )
        summary["consumables_total"] = float(summary["consumables_total"]) + _clamp_non_negative(
            item.get("consumables_total")
        )
    summary["grand_total"] = (
        float(summary["work_total"])
        + float(summary["material_total"])
        + float(summary["equipment_total"])
        + float(summary["consumables_total"])
    )
    return summary


def build_ceiling_specification(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for item in items:
        if not _is_enabled(item):
            continue
        category = str(item.get("category_snapshot") or item.get("category") or "")
        title = str(item.get("title_snapshot") or item.get("title") or "")
        unit = str(item.get("unit_snapshot") or item.get("unit") or "")
        key = (category, title, unit)
        row = grouped.setdefault(
            key,
            {
                "category": category,
                "title": title,
                "unit": unit,
                "quantity": 0.0,
                "work_total": 0.0,
                "material_total": 0.0,
                "equipment_total": 0.0,
                "consumables_total": 0.0,
                "total": 0.0,
            },
        )
        row["quantity"] += _clamp_non_negative(item.get("quantity"))
        row["work_total"] += _clamp_non_negative(item.get("work_total"))
        row["material_total"] += _clamp_non_negative(item.get("material_total"))
        row["equipment_total"] += _clamp_non_negative(item.get("equipment_total"))
        row["consumables_total"] += _clamp_non_negative(item.get("consumables_total"))
        row["total"] += _clamp_non_negative(item.get("total"))
    return [grouped[key] for key in sorted(grouped)]


__all__ = [
    "build_ceiling_project_item_from_catalog",
    "build_ceiling_specification",
    "build_ceiling_summary",
    "calculate_ceiling_item_totals",
    "calculate_ceiling_quantity",
]
