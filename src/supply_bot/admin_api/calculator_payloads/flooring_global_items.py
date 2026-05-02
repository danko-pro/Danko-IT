from __future__ import annotations

import json
from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_support import FlooringSpecMap, add_flooring_spec


def apply_flooring_global_items(
    summary: dict[str, Any],
    spec_map: FlooringSpecMap,
    config: dict[str, Any],
) -> None:
    try:
        items = json.loads(config.get("global_items_json") or "[]")
    except json.JSONDecodeError:
        items = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict) or not item.get("enabled", True):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        kind = "work" if item.get("kind") == "work" else "material"
        mode = str(item.get("mode") or "fixed")
        rate = max(0.0, float(item.get("rate") or 0.0))
        quantity = _global_item_quantity(summary, mode, item)
        amount = rate * quantity
        if amount <= 0:
            continue
        if kind == "work":
            summary["global_work_cost"] += amount
        else:
            summary["global_material_cost"] += amount
        add_flooring_spec(spec_map, kind, title, _global_item_unit(mode), quantity, amount)


def _global_item_quantity(summary: dict[str, Any], mode: str, item: dict[str, Any]) -> float:
    if mode == "area":
        return float(summary["total_area_m2"])
    if mode == "perimeter":
        return float(summary["total_perimeter_m"])
    if mode == "quantity":
        return max(0.0, float(item.get("quantity") or 0.0))
    return 1.0


def _global_item_unit(mode: str) -> str:
    if mode == "area":
        return "\u043c\u00b2"
    if mode == "perimeter":
        return "\u043c.\u043f."
    if mode == "quantity":
        return "\u0448\u0442"
    return "\u043a\u043e\u043c\u043f\u043b."
