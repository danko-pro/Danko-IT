from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.wall_finish_support import (
    add_wall_finish_spec,
    apply_wall_finish_room_selection,
)
from supply_bot.admin_api.calculator_payloads.wall_finish_zone_calc import (
    ROOM_COST_KEYS,
    ZONE_TOTAL_KEYS,
    calculate_wall_finish_zone,
)


def _zone_area(zone: dict[str, Any], *, effective_area: float, room_zones_count: int) -> float:
    if zone.get("area_m2") is not None:
        return max(0.0, float(zone["area_m2"]))
    return effective_area if room_zones_count == 1 else 0.0


def _zone_selection_payload(
    *,
    zone: dict[str, Any],
    zone_index: int,
    covering: dict[str, Any] | None,
    preparation: dict[str, Any] | None,
    layout: dict[str, Any] | None,
    estimate: dict[str, Any],
    zone_area: float,
) -> dict[str, Any]:
    return {
        "id": int(zone.get("id") or zone_index + 1),
        "covering_id": int(zone["covering_id"]) if zone.get("covering_id") else None,
        "covering_title": covering["title"] if covering else None,
        "preparation_id": int(zone["preparation_id"]) if zone.get("preparation_id") else None,
        "preparation_title": preparation["title"] if preparation else None,
        "layout_id": int(zone["layout_id"]) if zone.get("layout_id") else None,
        "layout_title": layout["title"] if layout else None,
        "area_m2": zone.get("area_m2"),
        "effective_area_m2": zone_area,
        "purchase_area_m2": estimate["purchase_area_m2"],
        "total_cost": estimate["total_cost"],
        "note": zone.get("note"),
    }


def build_wall_finish_zoned_room_payload(
    *,
    config: dict[str, Any],
    summary: dict[str, Any],
    spec_map: dict[tuple[str, str, str], dict[str, Any]],
    room: dict[str, Any],
    selected_row: dict[str, Any],
    room_zones: list[dict[str, Any]],
    coverings_by_id: dict[int, dict[str, Any]],
    preparations_by_id: dict[int, dict[str, Any]],
    layouts_by_id: dict[int, dict[str, Any]],
    base_area: float,
    effective_area: float,
) -> dict[str, Any]:
    totals = {key: 0.0 for key in ZONE_TOTAL_KEYS}
    zone_payloads: list[dict[str, Any]] = []
    available_area = effective_area
    for zone_index, zone in enumerate(room_zones):
        requested_area = _zone_area(zone, effective_area=effective_area, room_zones_count=len(room_zones))
        zone_area = min(requested_area, max(0.0, available_area))
        available_area -= zone_area
        covering = coverings_by_id.get(int(zone["covering_id"])) if zone.get("covering_id") else None
        preparation = preparations_by_id.get(int(zone["preparation_id"])) if zone.get("preparation_id") else None
        layout = layouts_by_id.get(int(zone["layout_id"])) if zone.get("layout_id") else None
        estimate = calculate_wall_finish_zone(
            config=config,
            covering=covering,
            preparation=preparation,
            layout=layout,
            effective_area=zone_area,
        )
        for key in totals:
            totals[key] += estimate[key]
        apply_wall_finish_room_selection(
            summary,
            spec_map,
            config=config,
            room={**estimate, "demolition_cost": 0.0},
            covering=covering,
            preparation=preparation,
            layout=layout,
        )
        zone_payloads.append(
            _zone_selection_payload(
                zone=zone,
                zone_index=zone_index,
                covering=covering,
                preparation=preparation,
                layout=layout,
                estimate=estimate,
                zone_area=zone_area,
            )
        )
    if len(room_zones) > 1:
        summary["rooms_count"] -= len(room_zones) - 1

    first_zone = room_zones[0]
    first_covering = coverings_by_id.get(int(first_zone["covering_id"])) if first_zone.get("covering_id") else None
    first_preparation = (
        preparations_by_id.get(int(first_zone["preparation_id"])) if first_zone.get("preparation_id") else None
    )
    first_layout = layouts_by_id.get(int(first_zone["layout_id"])) if first_zone.get("layout_id") else None
    demolition_cost = (
        effective_area * float(config["demolition_price_per_m2"] or 0.0)
        if bool(config["include_demolition"])
        else 0.0
    )
    summary["total_demolition_cost"] += demolition_cost
    add_wall_finish_spec(
        spec_map,
        "work",
        "Демонтаж старой отделки стен",
        "м²",
        effective_area,
        demolition_cost,
    )
    total_cost = sum(totals[key] for key in ROOM_COST_KEYS) + demolition_cost
    return {
        "room_id": int(room["id"]),
        "room_name": room["name"],
        "selected": True,
        "covering_id": zone_payloads[0]["covering_id"],
        "covering_title": first_covering["title"] if first_covering else None,
        "preparation_id": zone_payloads[0]["preparation_id"],
        "preparation_title": first_preparation["title"] if first_preparation else None,
        "layout_id": zone_payloads[0]["layout_id"],
        "layout_title": first_layout["title"] if first_layout else None,
        "base_area_m2": base_area,
        "effective_area_m2": effective_area,
        "area_m2_override": selected_row["area_m2_override"],
        "base_waste_percent": 0.0,
        "extra_waste_percent": 0.0,
        "total_waste_percent": 0.0,
        "purchase_area_m2": totals["purchase_area_m2"],
        "material_price_per_m2": 0.0,
        "base_labor_price_per_m2": 0.0,
        "layout_multiplier": 1.0,
        "labor_price_per_m2": 0.0,
        "material_cost": totals["material_cost"],
        "installation_cost": totals["installation_cost"],
        "preparation_work_cost": totals["preparation_work_cost"],
        "preparation_material_cost": totals["preparation_material_cost"],
        "preparation_total_cost": totals["preparation_total_cost"],
        "glue_qty": totals["glue_qty"],
        "glue_unit": summary["glue_unit"],
        "glue_cost": totals["glue_cost"],
        "primer_qty": totals["primer_qty"],
        "primer_unit": summary["primer_unit"],
        "primer_cost": totals["primer_cost"],
        "putty_qty": totals["putty_qty"],
        "putty_unit": summary["putty_unit"],
        "putty_cost": totals["putty_cost"],
        "mesh_qty": totals["mesh_qty"],
        "mesh_unit": summary["mesh_unit"],
        "mesh_cost": totals["mesh_cost"],
        "custom_consumables_cost": totals["custom_consumables_cost"],
        "demolition_cost": demolition_cost,
        "instrument_cost": totals["instrument_cost"],
        "total_cost": total_cost,
        "note": selected_row["note"],
        "zones": zone_payloads,
    }
