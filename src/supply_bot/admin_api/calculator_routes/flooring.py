import json
from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import custom_consumables_to_json
from supply_bot.admin_api.calculator_routes.shared import (
    clamp_minimum,
    clamp_non_negative,
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
    normalize_optional_text,
    require_estimate_project,
    require_non_empty_text,
)


def register_calculator_flooring_routes(
    app: FastAPI,
    *,
    calculator_flooring_covering_payload_model,
    calculator_flooring_preparation_payload_model,
    calculator_flooring_layout_payload_model,
    calculator_flooring_update_payload_model,
) -> None:
    @app.post("/api/calculator/flooring/coverings")
    async def create_calculator_flooring_covering(
        request: Request,
        payload: calculator_flooring_covering_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        covering_id = await storage_obj.create_estimate_flooring_covering(
            title=require_non_empty_text(payload.title, detail="Floor covering title is required"),
            material_price_per_m2=clamp_non_negative(payload.material_price_per_m2),
            labor_price_per_m2=clamp_non_negative(payload.labor_price_per_m2),
            base_waste_percent=clamp_non_negative(payload.base_waste_percent),
            underlay_mode=(payload.underlay_mode.strip() or "none"),
            underlay_consumption_per_m2=clamp_non_negative(payload.underlay_consumption_per_m2),
            glue_consumption_per_m2=clamp_non_negative(payload.glue_consumption_per_m2),
            glue_unit=payload.glue_unit.strip() or "кг",
            glue_price_per_unit=clamp_non_negative(payload.glue_price_per_unit),
            primer_consumption_per_m2=clamp_non_negative(payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(payload.primer_price_per_unit),
            svp_consumption_per_m2=clamp_non_negative(payload.svp_consumption_per_m2),
            svp_unit=payload.svp_unit.strip() or "шт",
            svp_price_per_unit=clamp_non_negative(payload.svp_price_per_unit),
            grout_consumption_per_m2=clamp_non_negative(payload.grout_consumption_per_m2),
            grout_unit=payload.grout_unit.strip() or "кг",
            grout_price_per_unit=clamp_non_negative(payload.grout_price_per_unit),
            custom_consumables_json=custom_consumables_to_json(payload.custom_consumables, clamp_non_negative),
            needs_plinth=payload.needs_plinth,
            instrument_price_per_m2=clamp_non_negative(payload.instrument_price_per_m2),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_coverings,
            created_id=covering_id,
            detail="Floor covering catalog item was not created",
        )

    @app.post("/api/calculator/flooring/preparations")
    async def create_calculator_flooring_preparation(
        request: Request,
        payload: calculator_flooring_preparation_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        preparation_id = await storage_obj.create_estimate_flooring_preparation(
            title=require_non_empty_text(payload.title, detail="Floor preparation title is required"),
            labor_price_per_m2=clamp_non_negative(payload.labor_price_per_m2),
            material_price_per_m2=clamp_non_negative(payload.material_price_per_m2),
            primer_consumption_per_m2=clamp_non_negative(payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(payload.primer_price_per_unit),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_preparations,
            created_id=preparation_id,
            detail="Floor preparation catalog item was not created",
        )

    @app.post("/api/calculator/flooring/layouts")
    async def create_calculator_flooring_layout(
        request: Request,
        payload: calculator_flooring_layout_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        layout_id = await storage_obj.create_estimate_flooring_layout(
            title=require_non_empty_text(payload.title, detail="Floor layout title is required"),
            labor_multiplier=clamp_minimum(payload.labor_multiplier, 0.1),
            extra_waste_percent=clamp_non_negative(payload.extra_waste_percent),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_layouts,
            created_id=layout_id,
            detail="Floor layout catalog item was not created",
        )

    @app.patch("/api/calculator/projects/{project_id}/flooring")
    async def update_calculator_flooring(
        request: Request,
        project_id: int,
        payload: calculator_flooring_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)

        rooms = await storage_obj.list_estimate_rooms(project_id)
        room_ids = {int(room["id"]) for room in rooms}
        covering_ids = {int(item["id"]) for item in await storage_obj.list_estimate_flooring_coverings()}
        preparation_ids = {int(item["id"]) for item in await storage_obj.list_estimate_flooring_preparations()}
        layout_ids = {int(item["id"]) for item in await storage_obj.list_estimate_flooring_layouts()}
        if payload.default_preparation_id is not None and payload.default_preparation_id not in preparation_ids:
            raise HTTPException(status_code=400, detail="Unknown floor preparation selected")

        rows: list[dict[str, Any]] = []
        zone_rows: list[dict[str, Any]] = []
        seen_room_ids: set[int] = set()
        for index, room_payload in enumerate(payload.rooms, start=1):
            room_id = int(room_payload.room_id)
            if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
                continue
            seen_room_ids.add(room_id)
            if room_payload.covering_id is not None and room_payload.covering_id not in covering_ids:
                raise HTTPException(status_code=400, detail="Unknown floor covering selected")
            if room_payload.preparation_id is not None and room_payload.preparation_id not in preparation_ids:
                raise HTTPException(status_code=400, detail="Unknown floor preparation selected")
            if room_payload.layout_id is not None and room_payload.layout_id not in layout_ids:
                raise HTTPException(status_code=400, detail="Unknown floor layout selected")
            for value in (
                room_payload.area_m2_override,
                room_payload.perimeter_m_override,
                room_payload.plinth_m_override,
            ):
                if value is not None and value < 0:
                    raise HTTPException(status_code=400, detail="Flooring overrides cannot be negative")
            room_base_area = next(
                (
                    float(room.get("floor_area_m2") or room.get("manual_floor_area_m2") or 0)
                    for room in rooms
                    if int(room["id"]) == room_id
                ),
                0.0,
            )
            room_effective_area = (
                room_payload.area_m2_override if room_payload.area_m2_override is not None else room_base_area
            )
            zones_payload = [
                {
                    "covering_id": zone.covering_id,
                    "preparation_id": zone.preparation_id,
                    "layout_id": zone.layout_id,
                    "area_m2": zone.area_m2,
                    "note": zone.note,
                }
                for zone in room_payload.zones
            ]
            if not zones_payload and (
                room_payload.covering_id is not None
                or room_payload.preparation_id is not None
                or room_payload.layout_id is not None
            ):
                zones_payload.append(
                    {
                        "covering_id": room_payload.covering_id,
                        "preparation_id": room_payload.preparation_id,
                        "layout_id": room_payload.layout_id,
                        "area_m2": None,
                        "note": room_payload.note,
                    }
                )
            zone_area_total = 0.0
            for zone_payload in zones_payload:
                if zone_payload["covering_id"] is not None and zone_payload["covering_id"] not in covering_ids:
                    raise HTTPException(status_code=400, detail="Unknown floor covering selected")
                if zone_payload["preparation_id"] is not None and zone_payload["preparation_id"] not in preparation_ids:
                    raise HTTPException(status_code=400, detail="Unknown floor preparation selected")
                if zone_payload["layout_id"] is not None and zone_payload["layout_id"] not in layout_ids:
                    raise HTTPException(status_code=400, detail="Unknown floor layout selected")
                if zone_payload["area_m2"] is not None and zone_payload["area_m2"] < 0:
                    raise HTTPException(status_code=400, detail="Flooring zone area cannot be negative")
                if zone_payload["area_m2"] is not None:
                    zone_area_total += float(zone_payload["area_m2"])
            if room_effective_area and zone_area_total > float(room_effective_area) + 0.0001:
                raise HTTPException(status_code=400, detail="Flooring zones cannot exceed room area")
            rows.append(
                {
                    "room_id": room_id,
                    "covering_id": room_payload.covering_id,
                    "preparation_id": room_payload.preparation_id,
                    "layout_id": room_payload.layout_id,
                    "area_m2_override": room_payload.area_m2_override,
                    "perimeter_m_override": room_payload.perimeter_m_override,
                    "plinth_m_override": room_payload.plinth_m_override,
                    "note": normalize_optional_text(room_payload.note),
                    "sort_order": index * 10,
                }
            )
            for zone_payload in zones_payload:
                zone_rows.append(
                    {
                        "room_id": room_id,
                        "covering_id": zone_payload["covering_id"],
                        "preparation_id": zone_payload["preparation_id"],
                        "layout_id": zone_payload["layout_id"],
                        "area_m2": zone_payload["area_m2"],
                        "note": normalize_optional_text(zone_payload["note"]),
                    }
                )

        await storage_obj.update_estimate_flooring_config(
            project_id,
            include_underlay=payload.include_underlay,
            include_plinth=payload.include_plinth,
            include_demolition=payload.include_demolition,
            include_preparation=payload.include_preparation,
            default_preparation_id=payload.default_preparation_id,
            demolition_price_per_m2=clamp_non_negative(payload.demolition_price_per_m2),
            underlay_price_per_m2=clamp_non_negative(payload.underlay_price_per_m2),
            plinth_material_price_per_m=clamp_non_negative(payload.plinth_material_price_per_m),
            plinth_install_price_per_m=clamp_non_negative(payload.plinth_install_price_per_m),
            threshold_profile_count=max(0, int(payload.threshold_profile_count)),
            threshold_profile_price=clamp_non_negative(payload.threshold_profile_price),
            global_items_json=json.dumps(
                [
                    {
                        "kind": item.kind,
                        "title": normalize_optional_text(item.title) or "",
                        "mode": item.mode,
                        "rate": clamp_non_negative(item.rate),
                        "quantity": clamp_non_negative(item.quantity),
                        "enabled": item.enabled,
                    }
                    for item in payload.global_items
                    if normalize_optional_text(item.title)
                ],
                ensure_ascii=False,
            ),
        )
        await storage_obj.replace_estimate_flooring_rooms(project_id, rows)
        await storage_obj.replace_estimate_flooring_room_zones(project_id, zone_rows)

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after flooring update",
        )
