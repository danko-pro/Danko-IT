from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_payloads import _estimate_project_payload, _estimate_room_detail
from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_estimate_project_payload,
    load_estimate_room_detail,
    normalize_optional_text,
    require_estimate_project,
    require_estimate_room,
    require_non_empty_text,
)
from supply_bot.estimates.application.create_project import (
    CreateEstimateProjectCommand,
    CreateEstimateProjectUseCase,
)
from supply_bot.estimates.application.create_room import (
    CreateEstimateRoomCommand,
    CreateEstimateRoomUseCase,
)
from supply_bot.estimates.application.update_room import (
    UpdateEstimateRoomCommand,
    UpdateEstimateRoomFloorSectionCommand,
    UpdateEstimateRoomOpeningCommand,
    UpdateEstimateRoomUseCase,
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
        command = CreateEstimateProjectCommand(
            name=payload.name,
            note=payload.note,
            group_chat_id=payload.group_chat_id,
        )
        try:
            project_id = await CreateEstimateProjectUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

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
        command = CreateEstimateRoomCommand(
            project_id=project_id,
            name=payload.name,
            ceiling_height_m=payload.ceiling_height_m,
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=payload.perimeter_factor,
        )
        try:
            room_id = await CreateEstimateRoomUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator project not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc

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
        command = UpdateEstimateRoomCommand(
            room_id=room_id,
            name=payload.name,
            ceiling_height_m=payload.ceiling_height_m,
            manual_floor_area_m2=payload.manual_floor_area_m2,
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=payload.perimeter_factor,
            note=payload.note,
            walls_m=payload.walls_m,
            floor_sections=[
                UpdateEstimateRoomFloorSectionCommand(
                    length_m=section.length_m,
                    width_m=section.width_m,
                )
                for section in payload.floor_sections
            ],
            openings=[
                UpdateEstimateRoomOpeningCommand(
                    opening_type=section.opening_type,
                    width_m=section.width_m,
                    height_m=section.height_m,
                    quantity=section.quantity,
                    area_m2=section.area_m2,
                    note=section.note,
                )
                for section in payload.openings
            ],
        )
        try:
            await UpdateEstimateRoomUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator room not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc

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
