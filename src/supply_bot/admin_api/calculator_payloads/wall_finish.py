from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.wall_finish_custom_consumables import (
    parse_wall_finish_custom_consumables,
)
from supply_bot.admin_api.calculator_payloads.wall_finish_support import (
    apply_wall_finish_room_selection,
    build_wall_finish_summary,
    finalize_wall_finish_summary,
)
from supply_bot.admin_api.calculator_payloads.wall_finish_zones import build_wall_finish_zoned_room_payload
from supply_bot.storage import BotStorage


async def _estimate_wall_finish_payload(
    storage: BotStorage,
    project: dict[str, Any],
    rooms: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_wall_finish_config(project_id)
    coverings = await storage.list_estimate_wall_finish_coverings()
    preparations = await storage.list_estimate_wall_finish_preparations()
    layouts = await storage.list_estimate_wall_finish_layouts()
    selected_rows = await storage.list_estimate_wall_finish_rooms(project_id)
    selected_zones = await storage.list_estimate_wall_finish_room_zones(project_id)

    selected_by_room = {int(row["room_id"]): row for row in selected_rows}
    zones_by_room: dict[int, list[dict[str, Any]]] = {}
    for zone in selected_zones:
        zones_by_room.setdefault(int(zone["room_id"]), []).append(zone)
    coverings_by_id = {int(item["id"]): item for item in coverings}
    preparations_by_id = {int(item["id"]): item for item in preparations}
    layouts_by_id = {int(item["id"]): item for item in layouts}

    summary = build_wall_finish_summary()
    spec_map: dict[tuple[str, str, str], dict[str, Any]] = {}
    rooms_payload: list[dict[str, Any]] = []

    for room in rooms:
        room_id = int(room["id"])
        selected_row = selected_by_room.get(room_id)
        selected = selected_row is not None
        covering = (
            coverings_by_id.get(int(selected_row["covering_id"]))
            if selected and selected_row.get("covering_id")
            else None
        )
        preparation = (
            preparations_by_id.get(int(selected_row["preparation_id"]))
            if selected and selected_row.get("preparation_id")
            else None
        )
        layout = (
            layouts_by_id.get(int(selected_row["layout_id"]))
            if selected and selected_row.get("layout_id")
            else None
        )

        base_area = float(room["wall_area_net_m2"] or 0.0)
        effective_area = (
            max(
                0.0,
                float(selected_row["area_m2_override"])
                if selected and selected_row.get("area_m2_override") is not None
                else base_area,
            )
            if selected
            else 0.0
        )
        room_zones = zones_by_room.get(room_id, []) if selected else []
        if selected and room_zones:
            rooms_payload.append(
                build_wall_finish_zoned_room_payload(
                    config=config,
                    summary=summary,
                    spec_map=spec_map,
                    room=room,
                    selected_row=selected_row,
                    room_zones=room_zones,
                    coverings_by_id=coverings_by_id,
                    preparations_by_id=preparations_by_id,
                    layouts_by_id=layouts_by_id,
                    base_area=base_area,
                    effective_area=effective_area,
                )
            )
            continue

        base_waste = float(covering["base_waste_percent"] or 0.0) if covering else 0.0
        extra_waste = float(layout["extra_waste_percent"] or 0.0) if layout else 0.0
        total_waste = base_waste + extra_waste
        purchase_area = effective_area * (1 + total_waste / 100.0) if selected else 0.0

        material_price = float(covering["material_price_per_m2"] or 0.0) if covering else 0.0
        base_labor = float(covering["labor_price_per_m2"] or 0.0) if covering else 0.0
        layout_multiplier = float(layout["labor_multiplier"] or 1.0) if layout else 1.0
        labor_with_coef = base_labor * layout_multiplier if selected else 0.0

        preparation_work_cost = 0.0
        preparation_material_cost = 0.0
        preparation_primer_qty = 0.0
        preparation_primer_cost = 0.0
        if selected and preparation and bool(config["include_preparation"]):
            preparation_work_cost = effective_area * float(preparation["labor_price_per_m2"] or 0.0)
            preparation_material_cost = effective_area * float(preparation["material_price_per_m2"] or 0.0)
            preparation_primer_qty = effective_area * float(preparation["primer_consumption_per_m2"] or 0.0)
            preparation_primer_cost = preparation_primer_qty * float(preparation["primer_price_per_unit"] or 0.0)
        preparation_total_cost = preparation_work_cost + preparation_material_cost

        material_cost = purchase_area * material_price
        installation_cost = effective_area * labor_with_coef
        glue_qty = purchase_area * float(covering["glue_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        glue_cost = glue_qty * float(covering["glue_price_per_unit"] or 0.0) if selected and covering else 0.0
        covering_primer_qty = (
            purchase_area * float(covering["primer_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        )
        covering_primer_cost = (
            covering_primer_qty * float(covering["primer_price_per_unit"] or 0.0) if selected and covering else 0.0
        )
        primer_qty = preparation_primer_qty + covering_primer_qty
        primer_cost = preparation_primer_cost + covering_primer_cost
        putty_qty = purchase_area * float(covering["putty_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        putty_cost = putty_qty * float(covering["putty_price_per_unit"] or 0.0) if selected and covering else 0.0
        mesh_qty = purchase_area * float(covering["mesh_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        mesh_cost = mesh_qty * float(covering["mesh_price_per_unit"] or 0.0) if selected and covering else 0.0
        custom_consumables_cost = sum(
            purchase_area * item["consumption_per_m2"] * item["price_per_unit"]
            for item in parse_wall_finish_custom_consumables(covering if selected else None)
        )
        demolition_cost = (
            effective_area * float(config["demolition_price_per_m2"] or 0.0)
            if selected and bool(config["include_demolition"])
            else 0.0
        )
        instrument_cost = (
            effective_area * float(covering["instrument_price_per_m2"] or 0.0) if selected and covering else 0.0
        )
        total_cost = (
            material_cost
            + installation_cost
            + preparation_total_cost
            + glue_cost
            + primer_cost
            + putty_cost
            + mesh_cost
            + custom_consumables_cost
            + demolition_cost
            + instrument_cost
        )

        room_estimate = {
            "effective_area_m2": effective_area,
            "purchase_area_m2": purchase_area,
            "material_cost": material_cost,
            "installation_cost": installation_cost,
            "preparation_work_cost": preparation_work_cost,
            "preparation_material_cost": preparation_material_cost,
            "preparation_total_cost": preparation_total_cost,
            "glue_qty": glue_qty,
            "glue_cost": glue_cost,
            "primer_qty": primer_qty,
            "primer_cost": primer_cost,
            "putty_qty": putty_qty,
            "putty_cost": putty_cost,
            "mesh_qty": mesh_qty,
            "mesh_cost": mesh_cost,
            "custom_consumables_cost": custom_consumables_cost,
            "demolition_cost": demolition_cost,
            "instrument_cost": instrument_cost,
        }
        if selected:
            apply_wall_finish_room_selection(
                summary,
                spec_map,
                config=config,
                room=room_estimate,
                covering=covering,
                preparation=preparation,
                layout=layout,
            )

        rooms_payload.append(
            {
                "room_id": room_id,
                "room_name": room["name"],
                "selected": selected,
                "covering_id": int(selected_row["covering_id"])
                if selected and selected_row.get("covering_id")
                else None,
                "covering_title": covering["title"] if covering else None,
                "preparation_id": int(selected_row["preparation_id"])
                if selected and selected_row.get("preparation_id")
                else None,
                "preparation_title": preparation["title"] if preparation else None,
                "layout_id": int(selected_row["layout_id"]) if selected and selected_row.get("layout_id") else None,
                "layout_title": layout["title"] if layout else None,
                "base_area_m2": base_area,
                "effective_area_m2": effective_area,
                "area_m2_override": selected_row["area_m2_override"] if selected else None,
                "base_waste_percent": base_waste,
                "extra_waste_percent": extra_waste,
                "total_waste_percent": total_waste,
                "purchase_area_m2": purchase_area,
                "material_price_per_m2": material_price,
                "base_labor_price_per_m2": base_labor,
                "layout_multiplier": layout_multiplier,
                "labor_price_per_m2": labor_with_coef,
                "material_cost": material_cost,
                "installation_cost": installation_cost,
                "preparation_work_cost": preparation_work_cost,
                "preparation_material_cost": preparation_material_cost,
                "preparation_total_cost": preparation_total_cost,
                "glue_qty": glue_qty,
                "glue_unit": summary["glue_unit"],
                "glue_cost": glue_cost,
                "primer_qty": primer_qty,
                "primer_unit": summary["primer_unit"],
                "primer_cost": primer_cost,
                "putty_qty": putty_qty,
                "putty_unit": summary["putty_unit"],
                "putty_cost": putty_cost,
                "mesh_qty": mesh_qty,
                "mesh_unit": summary["mesh_unit"],
                "mesh_cost": mesh_cost,
                "custom_consumables_cost": custom_consumables_cost,
                "demolition_cost": demolition_cost,
                "instrument_cost": instrument_cost,
                "total_cost": total_cost,
                "note": selected_row["note"] if selected else None,
            }
        )

    finalize_wall_finish_summary(summary)
    return {
        "config": config,
        "coverings": coverings,
        "preparations": preparations,
        "layouts": layouts,
        "rooms": rooms_payload,
        "summary": summary,
        "specification": list(spec_map.values()),
    }
