from __future__ import annotations

import json
from typing import Any


def parse_flooring_custom_consumables(covering: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not covering:
        return []
    try:
        items = json.loads(str(covering.get("custom_consumables_json") or "[]"))
    except json.JSONDecodeError:
        return []
    return [
        {
            "title": str(item.get("title") or "").strip(),
            "unit": str(item.get("unit") or "шт").strip() or "шт",
            "consumption_per_m2": max(0.0, float(item.get("consumption_per_m2") or 0.0)),
            "price_per_unit": max(0.0, float(item.get("price_per_unit") or 0.0)),
        }
        for item in items
        if str(item.get("title") or "").strip()
    ]


def custom_consumables_to_json(items: list[Any], clamp_non_negative) -> str:
    return json.dumps(
        [
            {
                "title": item.title.strip(),
                "consumption_per_m2": clamp_non_negative(item.consumption_per_m2),
                "unit": item.unit.strip() or "шт",
                "price_per_unit": clamp_non_negative(item.price_per_unit),
            }
            for item in items
            if item.title.strip()
        ],
        ensure_ascii=False,
    )
