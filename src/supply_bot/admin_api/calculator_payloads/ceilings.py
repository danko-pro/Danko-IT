from __future__ import annotations

from typing import Any

from supply_bot.estimates.domain.ceiling import build_ceiling_specification, build_ceiling_summary
from supply_bot.storage import BotStorage


async def _estimate_ceilings_payload(
    storage: BotStorage,
    project: dict[str, Any],
    room_payloads: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_ceiling_config(project_id)
    catalog_items = await storage.list_estimate_ceiling_catalog_items()
    selected_rooms = await storage.list_estimate_ceiling_rooms(project_id)
    project_items = await storage.list_estimate_project_ceiling_items(project_id)
    selected_by_room = {int(row["room_id"]): row for row in selected_rooms}

    rooms: list[dict[str, Any]] = []
    for room in room_payloads:
        room_id = int(room["id"])
        selected = selected_by_room.get(room_id)
        rooms.append(
            {
                "room_id": room_id,
                "room_name": room["name"],
                "selected": selected is not None,
                "base_ceiling_area_m2": float(room.get("floor_area_m2") or 0.0),
                "base_perimeter_m": float(room.get("perimeter_m") or 0.0),
                "default_catalog_item_id": selected.get("default_catalog_item_id") if selected else None,
                "is_enabled": selected.get("is_enabled") if selected else 0,
                "ceiling_area_m2": selected.get("ceiling_area_m2") if selected else None,
                "area_source": selected.get("area_source") if selected else "room_area",
                "perimeter_m": selected.get("perimeter_m") if selected else None,
                "perimeter_source": selected.get("perimeter_source") if selected else "room_perimeter",
                "package_code_snapshot": selected.get("package_code_snapshot") if selected else None,
                "note": selected.get("note") if selected else None,
                "sort_order": selected.get("sort_order") if selected else room.get("sort_order"),
            }
        )

    return {
        "config": config,
        "catalog_items": catalog_items,
        "rooms": rooms,
        "items": project_items,
        "summary": build_ceiling_summary(project_items),
        "specification": build_ceiling_specification(project_items),
    }
