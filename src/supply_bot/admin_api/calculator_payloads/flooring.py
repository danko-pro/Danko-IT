from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_plain import build_flooring_plain_room_payload
from supply_bot.admin_api.calculator_payloads.flooring_support import build_flooring_summary, finalize_flooring_summary
from supply_bot.admin_api.calculator_payloads.flooring_zones import build_flooring_zoned_room_payload
from supply_bot.storage import BotStorage


async def _estimate_flooring_payload(
    storage: BotStorage,
    project: dict[str, Any],
    room_payloads: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_flooring_config(project_id)
    coverings = await storage.list_estimate_flooring_coverings()
    preparations = await storage.list_estimate_flooring_preparations()
    layouts = await storage.list_estimate_flooring_layouts()
    selected_rows = await storage.list_estimate_flooring_rooms(project_id)
    selected_zones = await storage.list_estimate_flooring_room_zones(project_id)
    coverings_by_id = {int(item["id"]): item for item in coverings}
    preparations_by_id = {int(item["id"]): item for item in preparations}
    layouts_by_id = {int(item["id"]): item for item in layouts}
    rows_by_room = {int(item["room_id"]): item for item in selected_rows}
    zones_by_room: dict[int, list[dict[str, Any]]] = {}
    for zone in selected_zones:
        zones_by_room.setdefault(int(zone["room_id"]), []).append(zone)
    summary = build_flooring_summary(config)
    rooms_payload: list[dict[str, Any]] = []
    spec_map: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    default_preparation_id = config.get("default_preparation_id")

    for room in room_payloads:
        room_id = int(room["id"])
        selected_row = rows_by_room.get(room_id)
        selected = selected_row is not None
        covering = (
            coverings_by_id.get(int(selected_row["covering_id"]))
            if selected and selected_row.get("covering_id")
            else None
        )
        preparation_id = (
            selected_row.get("preparation_id")
            if selected and selected_row.get("preparation_id")
            else default_preparation_id
        )
        preparation = preparations_by_id.get(int(preparation_id)) if selected and preparation_id else None
        layout = (
            layouts_by_id.get(int(selected_row["layout_id"]))
            if selected and selected_row.get("layout_id")
            else None
        )
        base_area = float(room["floor_area_m2"] or 0.0)
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
        base_perimeter = float(room["perimeter_m"] or 0.0)
        effective_perimeter = (
            max(
                0.0,
                float(selected_row["perimeter_m_override"])
                if selected and selected_row.get("perimeter_m_override") is not None
                else base_perimeter,
            )
            if selected
            else 0.0
        )
        plinth_m = (
            max(
                0.0,
                float(selected_row["plinth_m_override"])
                if selected and selected_row.get("plinth_m_override") is not None
                else effective_perimeter,
            )
            if selected
            else 0.0
        )
        room_zones = zones_by_room.get(room_id, []) if selected else []
        if selected and room_zones:
            rooms_payload.append(
                build_flooring_zoned_room_payload(
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
                    base_perimeter=base_perimeter,
                    effective_perimeter=effective_perimeter,
                    plinth_m=plinth_m,
                )
            )
            continue
        rooms_payload.append(
            build_flooring_plain_room_payload(
                config=config,
                summary=summary,
                spec_map=spec_map,
                room=room,
                selected_row=selected_row,
                covering=covering,
                preparation=preparation,
                layout=layout,
                preparation_id=preparation_id,
                selected=selected,
                base_area=base_area,
                effective_area=effective_area,
                base_perimeter=base_perimeter,
                effective_perimeter=effective_perimeter,
                plinth_m=plinth_m,
            )
        )

    finalize_flooring_summary(summary, spec_map, config)
    return {
        "config": config,
        "coverings": coverings,
        "preparations": preparations,
        "layouts": layouts,
        "rooms": rooms_payload,
        "summary": summary,
        "specification": list(spec_map.values()),
    }
