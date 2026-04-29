from __future__ import annotations

import json
from typing import Any


def load_material_items(raw_value: Any, fallback: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not raw_value:
        return fallback
    try:
        loaded = json.loads(str(raw_value))
    except json.JSONDecodeError:
        return fallback
    if not isinstance(loaded, list):
        return fallback
    items: list[dict[str, Any]] = []
    for item in loaded:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        items.append(
            {
                "title": title,
                "unit": str(item.get("unit") or "компл.").strip() or "компл.",
                "quantity": max(0.0, float(item.get("quantity") or 0)),
                "amount": max(0.0, float(item.get("amount") or 0)),
            }
        )
    return items or fallback


def items_total(items: list[dict[str, Any]]) -> float:
    return sum(float(item.get("amount") or 0) for item in items)
