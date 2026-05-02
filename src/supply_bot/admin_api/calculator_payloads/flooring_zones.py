from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_support import add_flooring_spec, apply_flooring_room_selection
from supply_bot.admin_api.calculator_payloads.flooring_zone_calc import (
    ROOM_COST_KEYS,
    ZONE_TOTAL_KEYS,
    calculate_flooring_zone,
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
    preparation_id: Any,
    layout: dict[str, Any] | None,
    estimate: dict[str, Any],
    zone_area: float,
) -> dict[str, Any]:
    return {
        "id": int(zone.get("id") or zone_index + 1),
        "covering_id": int(zone["covering_id"]) if zone.get("covering_id") else None,
        "covering_title": covering["title"] if covering else None,
        "preparation_id": int(preparation_id) if preparation_id else None,
        "preparation_title": preparation["title"] if preparation else None,
        "layout_id": int(zone["layout_id"]) if zone.get("layout_id") else None,
        "layout_title": layout["title"] if layout else None,
        "area_m2": zone.get("area_m2"),
        "effective_area_m2": zone_area,
        "purchase_area_m2": estimate["purchase_area_m2"],
        "total_cost": estimate["total_cost"],
        "note": zone.get("note"),
    }


def _find_plinth_covering(
    room_zones: list[dict[str, Any]],
    coverings_by_id: dict[int, dict[str, Any]],
) -> dict[str, Any] | None:
    for zone in room_zones:
        if not zone.get("covering_id"):
            continue
        covering = coverings_by_id.get(int(zone["covering_id"]))
        if covering and bool(covering["needs_plinth"]):
            return covering
    return None


def build_flooring_zoned_room_payload(
    *,
    config: dict[str, Any],
    summary: dict[str, Any],
    spec_map: dict[tuple[str, str, str, str], dict[str, Any]],
    room: dict[str, Any],
    selected_row: dict[str, Any],
    room_zones: list[dict[str, Any]],
    coverings_by_id: dict[int, dict[str, Any]],
    preparations_by_id: dict[int, dict[str, Any]],
    layouts_by_id: dict[int, dict[str, Any]],
    base_area: float,
    effective_area: float,
    base_perimeter: float,
    effective_perimeter: float,
    plinth_m: float,
) -> dict[str, Any]:
    totals = {key: 0.0 for key in ZONE_TOTAL_KEYS}
    zone_payloads: list[dict[str, Any]] = []
    available_area = effective_area
    default_preparation_id = config.get("default_preparation_id")
    for zone_index, zone in enumerate(room_zones):
        requested_area = _zone_area(zone, effective_area=effective_area, room_zones_count=len(room_zones))
        zone_area = min(requested_area, max(0.0, available_area))
        available_area -= zone_area
        covering = coverings_by_id.get(int(zone["covering_id"])) if zone.get("covering_id") else None
        preparation_id = zone.get("preparation_id") if zone.get("preparation_id") else default_preparation_id
        preparation = preparations_by_id.get(int(preparation_id)) if preparation_id else None
        layout = layouts_by_id.get(int(zone["layout_id"])) if zone.get("layout_id") else None
        estimate = calculate_flooring_zone(
            config=config,
            covering=covering,
            preparation=preparation,
            layout=layout,
            effective_area=zone_area,
        )
        for key in totals:
            totals[key] += estimate[key]
        apply_flooring_room_selection(
            summary,
            spec_map,
            config=config,
            room={
                **estimate,
                "plinth_m": 0.0,
                "plinth_material_cost": 0.0,
                "plinth_install_cost": 0.0,
                "demolition_cost": 0.0,
            },
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
                preparation_id=preparation_id,
                layout=layout,
                estimate=estimate,
                zone_area=zone_area,
            )
        )
    if len(room_zones) > 1:
        summary["rooms_count"] -= len(room_zones) - 1

    first_zone = room_zones[0]
    first_covering = coverings_by_id.get(int(first_zone["covering_id"])) if first_zone.get("covering_id") else None
    first_preparation_id = (
        first_zone.get("preparation_id") if first_zone.get("preparation_id") else default_preparation_id
    )
    first_preparation = preparations_by_id.get(int(first_preparation_id)) if first_preparation_id else None
    first_layout = layouts_by_id.get(int(first_zone["layout_id"])) if first_zone.get("layout_id") else None
    plinth_covering = _find_plinth_covering(room_zones, coverings_by_id)
    plinth_material_cost = plinth_install_cost = 0.0
    if plinth_covering and bool(config["include_plinth"]):
        plinth_material_cost = plinth_m * float(config["plinth_material_price_per_m"] or 0.0)
        plinth_install_cost = plinth_m * float(config["plinth_install_price_per_m"] or 0.0)
        summary["total_plinth_m"] += plinth_m
        summary["total_plinth_material_cost"] += plinth_material_cost
        summary["total_plinth_install_cost"] += plinth_install_cost
        add_flooring_spec(
            spec_map,
            "material",
            "\u041f\u043b\u0438\u043d\u0442\u0443\u0441",
            "\u043c.\u043f.",
            plinth_m,
            plinth_material_cost,
        )
        add_flooring_spec(
            spec_map,
            "work",
            "\u041c\u043e\u043d\u0442\u0430\u0436 \u043f\u043b\u0438\u043d\u0442\u0443\u0441\u0430",
            "\u043c.\u043f.",
            plinth_m,
            plinth_install_cost,
        )
    else:
        plinth_m = 0.0
    demolition_cost = (
        effective_area * float(config["demolition_price_per_m2"] or 0.0)
        if bool(config["include_demolition"])
        else 0.0
    )
    summary["total_demolition_cost"] += demolition_cost
    summary["total_perimeter_m"] += effective_perimeter
    add_flooring_spec(
        spec_map,
        "work",
        "Демонтаж напольного покрытия",
        "\u043c\u00b2",
        effective_area,
        demolition_cost,
    )
    total_cost = (
        sum(totals[key] for key in ROOM_COST_KEYS)
        + plinth_material_cost
        + plinth_install_cost
        + demolition_cost
    )
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
        "base_perimeter_m": base_perimeter,
        "effective_perimeter_m": effective_perimeter,
        "plinth_m": plinth_m,
        "area_m2_override": selected_row["area_m2_override"],
        "perimeter_m_override": selected_row["perimeter_m_override"],
        "plinth_m_override": selected_row["plinth_m_override"],
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
        "underlay_qty": totals["underlay_qty"],
        "underlay_cost": totals["underlay_cost"],
        "glue_qty": totals["glue_qty"],
        "glue_unit": summary["glue_unit"],
        "glue_cost": totals["glue_cost"],
        "primer_qty": totals["primer_qty"],
        "primer_unit": summary["primer_unit"],
        "primer_cost": totals["primer_cost"],
        "svp_qty": totals["svp_qty"],
        "svp_unit": summary["svp_unit"],
        "svp_cost": totals["svp_cost"],
        "grout_qty": totals["grout_qty"],
        "grout_unit": summary["grout_unit"],
        "grout_cost": totals["grout_cost"],
        "custom_consumables_cost": totals["custom_consumables_cost"],
        "plinth_material_cost": plinth_material_cost,
        "plinth_install_cost": plinth_install_cost,
        "demolition_cost": demolition_cost,
        "instrument_cost": totals["instrument_cost"],
        "total_cost": total_cost,
        "note": selected_row["note"],
        "zones": zone_payloads,
    }
