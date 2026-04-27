from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_payloads import _estimate_project_payload, _estimate_room_detail
from supply_bot.admin_api.calculator_routes.shared import (
    clamp_non_negative,
    clamp_minimum,
    get_calculator_route_storage,
    load_estimate_project_payload,
    load_estimate_room_detail,
    normalize_optional_text,
    require_estimate_project,
    require_estimate_room,
    require_non_empty_text,
)


def register_calculator_core_routes(
    app: FastAPI,
    *,
    calculator_project_create_payload_model,
    calculator_project_update_payload_model,
    calculator_room_create_payload_model,
    calculator_room_update_payload_model,
) -> None:
    @app.get("/api/calculator/projects")
    async def calculator_projects(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await storage_obj.list_estimate_projects()

    @app.post("/api/calculator/projects")
    async def create_calculator_project(
        request: Request,
        payload: calculator_project_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.create_estimate_project(
            name=require_non_empty_text(payload.name, detail="Project name is required"),
            note=normalize_optional_text(payload.note),
            group_chat_id=payload.group_chat_id,
        )
        return await load_estimate_project_payload(storage_obj, project_id, detail="Project was not created")

    @app.get("/api/calculator/projects/{project_id}")
    async def calculator_project_detail(request: Request, project_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project = await require_estimate_project(storage_obj, project_id)
        return await _estimate_project_payload(storage_obj, project)

    @app.patch("/api/calculator/projects/{project_id}")
    async def update_calculator_project(
        request: Request,
        project_id: int,
        payload: calculator_project_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)

        lift_type = normalize_optional_text(payload.lift_type) or ""
        await storage_obj.update_estimate_project(
            project_id,
            name=require_non_empty_text(payload.name, detail="Project name is required"),
            residential_complex=normalize_optional_text(payload.residential_complex) or "",
            address=normalize_optional_text(payload.address) or "",
            entrance_section=normalize_optional_text(payload.entrance_section) or "",
            apartment=normalize_optional_text(payload.apartment) or "",
            floor=normalize_optional_text(payload.floor) or "",
            has_elevator=0 if lift_type in {"", "none"} else 1,
            lift_type=lift_type,
            site_access=normalize_optional_text(payload.site_access) or "",
            intercom_code=normalize_optional_text(payload.intercom_code) or "",
            loading_zone=normalize_optional_text(payload.loading_zone) or "",
            responsible_person=normalize_optional_text(payload.responsible_person) or "",
            note=normalize_optional_text(payload.note),
        )
        return await load_estimate_project_payload(storage_obj, project_id, detail="Project update failed")

    @app.post("/api/calculator/projects/{project_id}/rooms")
    async def create_calculator_room(
        request: Request,
        project_id: int,
        payload: calculator_room_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        existing_rooms = await storage_obj.list_estimate_rooms(project_id)
        room_id = await storage_obj.create_estimate_room(
            project_id=project_id,
            name=normalize_optional_text(payload.name) or f"Помещение {len(existing_rooms) + 1}",
            ceiling_height_m=clamp_minimum(payload.ceiling_height_m, 0.1),
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=clamp_minimum(payload.perimeter_factor, 1.0),
        )
        return await load_estimate_room_detail(storage_obj, room_id, detail="Room was not created")

    @app.get("/api/calculator/rooms/{room_id}")
    async def calculator_room_detail(request: Request, room_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        room = await require_estimate_room(storage_obj, room_id)
        return await _estimate_room_detail(storage_obj, room)

    @app.patch("/api/calculator/rooms/{room_id}")
    async def update_calculator_room(
        request: Request,
        room_id: int,
        payload: calculator_room_create_payload_model | calculator_room_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_room(storage_obj, room_id)

        manual_floor_area_m2 = payload.manual_floor_area_m2
        if manual_floor_area_m2 is not None and manual_floor_area_m2 < 0:
            raise HTTPException(status_code=400, detail="Floor area cannot be negative")

        await storage_obj.update_estimate_room(
            room_id,
            name=require_non_empty_text(payload.name, detail="Room name is required"),
            ceiling_height_m=clamp_minimum(payload.ceiling_height_m, 0.1),
            manual_floor_area_m2=manual_floor_area_m2,
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=clamp_minimum(payload.perimeter_factor, 1.0),
            note=normalize_optional_text(payload.note),
        )
        await storage_obj.replace_estimate_room_walls(
            room_id,
            [float(value) for value in payload.walls_m if value and value > 0],
        )
        await storage_obj.replace_estimate_room_floor_sections(
            room_id,
            [
                {
                    "length_m": clamp_non_negative(section.length_m),
                    "width_m": clamp_non_negative(section.width_m),
                }
                for section in payload.floor_sections
            ],
        )
        await storage_obj.replace_estimate_room_openings(
            room_id,
            [
                {
                    "opening_type": section.opening_type,
                    "width_m": clamp_non_negative(section.width_m) if section.width_m is not None else None,
                    "height_m": clamp_non_negative(section.height_m) if section.height_m is not None else None,
                    "quantity": clamp_non_negative(section.quantity) if section.quantity is not None else None,
                    "area_m2": clamp_non_negative(section.area_m2) if section.area_m2 is not None else None,
                    "note": section.note,
                }
                for section in payload.openings
            ],
        )
        return await load_estimate_room_detail(storage_obj, room_id, detail="Room update failed")

    @app.delete("/api/calculator/rooms/{room_id}")
    async def delete_calculator_room(request: Request, room_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        room = await require_estimate_room(storage_obj, room_id)
        project_id = int(room["project_id"])
        await storage_obj.delete_estimate_room(room_id)
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after room deletion",
        )
