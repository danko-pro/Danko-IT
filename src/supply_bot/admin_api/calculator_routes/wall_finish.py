from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_routes.shared import (
    catalog_consumables_to_json,
    clamp_minimum,
    clamp_non_negative,
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
    normalize_optional_text,
    require_estimate_project,
    require_non_empty_text,
)


def register_calculator_wall_finish_routes(
    app: FastAPI,
    *,
    calculator_wall_finish_covering_payload_model,
    calculator_wall_finish_preparation_payload_model,
    calculator_wall_finish_layout_payload_model,
    calculator_wall_finish_update_payload_model,
) -> None:
    @app.post("/api/calculator/wall-finishes/coverings")
    async def create_calculator_wall_finish_covering(
        request: Request,
        payload: calculator_wall_finish_covering_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        covering_id = await storage_obj.create_estimate_wall_finish_covering(
            title=require_non_empty_text(payload.title, detail="Wall finish title is required"),
            material_price_per_m2=clamp_non_negative(payload.material_price_per_m2),
            labor_price_per_m2=clamp_non_negative(payload.labor_price_per_m2),
            base_waste_percent=clamp_non_negative(payload.base_waste_percent),
            glue_consumption_per_m2=clamp_non_negative(payload.glue_consumption_per_m2),
            glue_unit=payload.glue_unit.strip() or "кг",
            glue_price_per_unit=clamp_non_negative(payload.glue_price_per_unit),
            primer_consumption_per_m2=clamp_non_negative(payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(payload.primer_price_per_unit),
            putty_consumption_per_m2=clamp_non_negative(payload.putty_consumption_per_m2),
            putty_unit=payload.putty_unit.strip() or "кг",
            putty_price_per_unit=clamp_non_negative(payload.putty_price_per_unit),
            mesh_consumption_per_m2=clamp_non_negative(payload.mesh_consumption_per_m2),
            mesh_unit=payload.mesh_unit.strip() or "м²",
            mesh_price_per_unit=clamp_non_negative(payload.mesh_price_per_unit),
            custom_consumables_json=catalog_consumables_to_json(payload.custom_consumables),
            instrument_price_per_m2=clamp_non_negative(payload.instrument_price_per_m2),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_wall_finish_coverings,
            created_id=covering_id,
            detail="Wall finish catalog item was not created",
        )

    @app.post("/api/calculator/wall-finishes/preparations")
    async def create_calculator_wall_finish_preparation(
        request: Request,
        payload: calculator_wall_finish_preparation_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        preparation_id = await storage_obj.create_estimate_wall_finish_preparation(
            title=require_non_empty_text(payload.title, detail="Wall preparation title is required"),
            labor_price_per_m2=clamp_non_negative(payload.labor_price_per_m2),
            material_price_per_m2=clamp_non_negative(payload.material_price_per_m2),
            primer_consumption_per_m2=clamp_non_negative(payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=clamp_non_negative(payload.primer_price_per_unit),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_wall_finish_preparations,
            created_id=preparation_id,
            detail="Wall preparation catalog item was not created",
        )

    @app.post("/api/calculator/wall-finishes/layouts")
    async def create_calculator_wall_finish_layout(
        request: Request,
        payload: calculator_wall_finish_layout_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        layout_id = await storage_obj.create_estimate_wall_finish_layout(
            title=require_non_empty_text(payload.title, detail="Wall layout title is required"),
            labor_multiplier=clamp_minimum(payload.labor_multiplier, 0.1),
            extra_waste_percent=clamp_non_negative(payload.extra_waste_percent),
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_wall_finish_layouts,
            created_id=layout_id,
            detail="Wall layout catalog item was not created",
        )

    @app.patch("/api/calculator/projects/{project_id}/wall-finishes")
    async def update_calculator_wall_finishes(
        request: Request,
        project_id: int,
        payload: calculator_wall_finish_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        project_snapshot = await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Calculator project was not loaded",
        )

        rooms = project_snapshot["rooms"]
        room_ids = {int(room["id"]) for room in rooms}
        covering_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_coverings()}
        preparation_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_preparations()}
        layout_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_layouts()}

        rows: list[dict[str, Any]] = []
        zone_rows: list[dict[str, Any]] = []
        seen_room_ids: set[int] = set()
        for index, room_payload in enumerate(payload.rooms, start=1):
            room_id = int(room_payload.room_id)
            if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
                continue
            seen_room_ids.add(room_id)
            if room_payload.covering_id is not None and room_payload.covering_id not in covering_ids:
                raise HTTPException(status_code=400, detail="Unknown wall finish selected")
            if room_payload.preparation_id is not None and room_payload.preparation_id not in preparation_ids:
                raise HTTPException(status_code=400, detail="Unknown wall preparation selected")
            if room_payload.layout_id is not None and room_payload.layout_id not in layout_ids:
                raise HTTPException(status_code=400, detail="Unknown wall layout selected")
            if room_payload.area_m2_override is not None and room_payload.area_m2_override < 0:
                raise HTTPException(status_code=400, detail="Wall finish override cannot be negative")
            room_base_area = next(
                (float(room.get("wall_area_net_m2") or 0) for room in rooms if int(room["id"]) == room_id),
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
                    raise HTTPException(status_code=400, detail="Unknown wall finish selected")
                if zone_payload["preparation_id"] is not None and zone_payload["preparation_id"] not in preparation_ids:
                    raise HTTPException(status_code=400, detail="Unknown wall preparation selected")
                if zone_payload["layout_id"] is not None and zone_payload["layout_id"] not in layout_ids:
                    raise HTTPException(status_code=400, detail="Unknown wall layout selected")
                if zone_payload["area_m2"] is not None and zone_payload["area_m2"] < 0:
                    raise HTTPException(status_code=400, detail="Wall finish zone area cannot be negative")
                if zone_payload["area_m2"] is not None:
                    zone_area_total += float(zone_payload["area_m2"])
            if zone_area_total > float(room_effective_area) + 0.0001:
                raise HTTPException(status_code=400, detail="Wall finish zones cannot exceed room area")
            rows.append(
                {
                    "room_id": room_id,
                    "covering_id": room_payload.covering_id,
                    "preparation_id": room_payload.preparation_id,
                    "layout_id": room_payload.layout_id,
                    "area_m2_override": room_payload.area_m2_override,
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

        await storage_obj.update_estimate_wall_finish_config(
            project_id,
            include_preparation=payload.include_preparation,
            include_demolition=payload.include_demolition,
            demolition_price_per_m2=clamp_non_negative(payload.demolition_price_per_m2),
        )
        await storage_obj.replace_estimate_wall_finish_rooms(project_id, rows)
        await storage_obj.replace_estimate_wall_finish_room_zones(project_id, zone_rows)

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after wall finish update",
        )
