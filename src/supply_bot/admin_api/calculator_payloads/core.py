from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.doors import _estimate_project_doors
from supply_bot.admin_api.calculator_payloads.flooring import _estimate_flooring_payload
from supply_bot.admin_api.calculator_payloads.wall_finish import _estimate_wall_finish_payload
from supply_bot.admin_api.calculator_payloads.warm_floor import _estimate_warm_floor_payload
from supply_bot.estimates.domain.room_geometry import estimate_room_stats
from supply_bot.storage import BotStorage


async def _estimate_project_payload(storage: BotStorage, project: dict[str, Any]) -> dict[str, Any]:
    project_id = int(project["id"])
    rooms = await storage.list_estimate_rooms(project_id)
    door_areas_by_room, doors_count = await _estimate_project_doors(storage, project_id)
    project_doors = await storage.list_estimate_project_doors(project_id)
    door_catalog = await storage.list_estimate_door_catalog()
    door_component_catalog = await storage.list_estimate_door_component_catalog()
    project_door_components = await storage.list_estimate_project_door_components(project_id)
    room_payloads = []
    summary = {
        "rooms_count": 0,
        "floor_area_m2": 0.0,
        "wall_area_gross_m2": 0.0,
        "openings_area_m2": 0.0,
        "door_area_m2": 0.0,
        "wall_area_net_m2": 0.0,
        "perimeter_m": 0.0,
        "doors_count": doors_count,
        "door_purchase_total": 0.0,
        "door_sale_total": 0.0,
        "door_install_total": 0.0,
        "door_components_purchase_total": 0.0,
        "door_components_sale_total": 0.0,
    }
    components_by_door: dict[int, list[dict[str, Any]]] = {}
    component_totals_by_door: dict[int, dict[str, float]] = {}
    for component in project_door_components:
        door_id = int(component["project_door_id"])
        components_by_door.setdefault(door_id, []).append(component)
        quantity = float(component["quantity"] or 0.0)
        purchase_total = quantity * float(component["purchase_price"] or 0.0)
        sale_total = quantity * float(component["sale_price"] or 0.0)
        totals = component_totals_by_door.setdefault(door_id, {"purchase": 0.0, "sale": 0.0})
        totals["purchase"] += purchase_total
        totals["sale"] += sale_total
        component["purchase_total"] = purchase_total
        component["sale_total"] = sale_total

    for room in rooms:
        room_payload = await _estimate_room_summary(storage, room, door_areas_by_room.get(int(room["id"]), 0.0))
        room_payloads.append(room_payload)
        summary["rooms_count"] += 1
        summary["floor_area_m2"] += room_payload["floor_area_m2"]
        summary["wall_area_gross_m2"] += room_payload["wall_area_gross_m2"]
        summary["openings_area_m2"] += room_payload["openings_area_m2"]
        summary["door_area_m2"] += room_payload["door_area_m2"]
        summary["wall_area_net_m2"] += room_payload["wall_area_net_m2"]
        summary["perimeter_m"] += room_payload["perimeter_m"]

    for door in project_doors:
        door_id = int(door["id"])
        component_totals = component_totals_by_door.get(door_id, {"purchase": 0.0, "sale": 0.0})
        manual_purchase = door["purchase_price"]
        manual_sale = door["sale_price"]
        effective_purchase = float(manual_purchase) if manual_purchase is not None else component_totals["purchase"]
        effective_sale = float(manual_sale) if manual_sale is not None else component_totals["sale"]
        install_total = float(door["install_price"] or 0.0)
        door["components"] = components_by_door.get(door_id, [])
        door["components_purchase_total"] = component_totals["purchase"]
        door["components_sale_total"] = component_totals["sale"]
        door["effective_purchase_price"] = effective_purchase
        door["effective_sale_price"] = effective_sale
        door["effective_install_price"] = install_total
        summary["door_components_purchase_total"] += component_totals["purchase"]
        summary["door_components_sale_total"] += component_totals["sale"]
        summary["door_purchase_total"] += effective_purchase
        summary["door_sale_total"] += effective_sale
        summary["door_install_total"] += install_total

    warm_floor = await _estimate_warm_floor_payload(storage, project, room_payloads)
    flooring = await _estimate_flooring_payload(storage, project, room_payloads)
    wall_finishes = await _estimate_wall_finish_payload(storage, project, room_payloads)

    return {
        "project": {
            **project,
            "rooms_count": summary["rooms_count"],
        },
        "summary": summary,
        "rooms": room_payloads,
        "warm_floor": warm_floor,
        "flooring": flooring,
        "wall_finishes": wall_finishes,
        "doors": project_doors,
        "door_catalog": door_catalog,
        "door_component_catalog": door_component_catalog,
    }


async def _estimate_room_detail(storage: BotStorage, room: dict[str, Any]) -> dict[str, Any]:
    walls = await storage.list_estimate_room_walls(int(room["id"]))
    floor_sections = await storage.list_estimate_room_floor_sections(int(room["id"]))
    openings = await storage.list_estimate_room_openings(int(room["id"]))
    door_areas_by_room, _ = await _estimate_project_doors(storage, int(room["project_id"]))
    stats = estimate_room_stats(
        room=room,
        walls=walls,
        floor_sections=floor_sections,
        openings=openings,
        door_area_m2=door_areas_by_room.get(int(room["id"]), 0.0),
    )
    return {
        "room": room,
        "walls": walls,
        "floor_sections": floor_sections,
        "openings": openings,
        "stats": stats,
    }


async def _estimate_room_summary(
    storage: BotStorage,
    room: dict[str, Any],
    door_area_m2: float,
) -> dict[str, Any]:
    walls = await storage.list_estimate_room_walls(int(room["id"]))
    floor_sections = await storage.list_estimate_room_floor_sections(int(room["id"]))
    openings = await storage.list_estimate_room_openings(int(room["id"]))
    stats = estimate_room_stats(
        room=room,
        walls=walls,
        floor_sections=floor_sections,
        openings=openings,
        door_area_m2=door_area_m2,
    )
    return {
        "id": int(room["id"]),
        "project_id": int(room["project_id"]),
        "name": room["name"],
        "ceiling_height_m": float(room["ceiling_height_m"]),
        "manual_floor_area_m2": room["manual_floor_area_m2"],
        "auto_perimeter_calc": bool(room["auto_perimeter_calc"]),
        "perimeter_factor": float(room["perimeter_factor"]),
        "note": room["note"],
        "sort_order": int(room["sort_order"]),
        **stats,
    }
