# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _estimate_project_payload, _estimate_room_detail
from supply_bot.storage import BotStorage


def register_calculator_core_routes(
    app: FastAPI,
    *,
    calculator_project_create_payload_model,
    calculator_room_create_payload_model,
    calculator_room_update_payload_model,
) -> None:
    # Базовый контур калькулятора: проект и комнаты. На него опираются все остальные модули.
    @app.get("/api/calculator/projects")
    async def calculator_projects(request: Request) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        return await storage_obj.list_estimate_projects()

    @app.post("/api/calculator/projects")
    async def create_calculator_project(
        request: Request,
        payload: calculator_project_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Project name is required")
        project_id = await storage_obj.create_estimate_project(
            name=name,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
            group_chat_id=payload.group_chat_id,
        )
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project was not created")
        return await _estimate_project_payload(storage_obj, project)

    @app.get("/api/calculator/projects/{project_id}")
    async def calculator_project_detail(request: Request, project_id: int) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Calculator project not found")
        return await _estimate_project_payload(storage_obj, project)

    @app.post("/api/calculator/projects/{project_id}/rooms")
    async def create_calculator_room(
        request: Request,
        project_id: int,
        payload: calculator_room_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Calculator project not found")
        existing_rooms = await storage_obj.list_estimate_rooms(project_id)
        room_name = (
            payload.name.strip() if payload.name and payload.name.strip() else f"Помещение {len(existing_rooms) + 1}"
        )
        room_id = await storage_obj.create_estimate_room(
            project_id=project_id,
            name=room_name,
            ceiling_height_m=max(0.1, payload.ceiling_height_m),
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=max(1.0, payload.perimeter_factor),
        )
        room = await storage_obj.get_estimate_room(room_id)
        if not room:
            raise HTTPException(status_code=500, detail="Room was not created")
        return await _estimate_room_detail(storage_obj, room)

    @app.get("/api/calculator/rooms/{room_id}")
    async def calculator_room_detail(request: Request, room_id: int) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        room = await storage_obj.get_estimate_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Calculator room not found")
        return await _estimate_room_detail(storage_obj, room)

    @app.patch("/api/calculator/rooms/{room_id}")
    async def update_calculator_room(
        request: Request,
        room_id: int,
        payload: calculator_room_create_payload_model | calculator_room_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        room = await storage_obj.get_estimate_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Calculator room not found")

        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Room name is required")

        ceiling_height_m = max(0.1, payload.ceiling_height_m)
        perimeter_factor = max(1.0, payload.perimeter_factor)
        manual_floor_area_m2 = payload.manual_floor_area_m2
        if manual_floor_area_m2 is not None and manual_floor_area_m2 < 0:
            raise HTTPException(status_code=400, detail="Floor area cannot be negative")

        await storage_obj.update_estimate_room(
            room_id,
            name=name,
            ceiling_height_m=ceiling_height_m,
            manual_floor_area_m2=manual_floor_area_m2,
            auto_perimeter_calc=payload.auto_perimeter_calc,
            perimeter_factor=perimeter_factor,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        await storage_obj.replace_estimate_room_walls(
            room_id,
            [float(value) for value in payload.walls_m if value and value > 0],
        )
        await storage_obj.replace_estimate_room_floor_sections(
            room_id,
            [
                {
                    "length_m": float(section.length_m or 0),
                    "width_m": float(section.width_m or 0),
                }
                for section in payload.floor_sections
            ],
        )
        await storage_obj.replace_estimate_room_openings(
            room_id,
            [
                {
                    "opening_type": section.opening_type,
                    "width_m": section.width_m,
                    "height_m": section.height_m,
                    "quantity": section.quantity,
                    "area_m2": section.area_m2,
                    "note": section.note,
                }
                for section in payload.openings
            ],
        )
        fresh_room = await storage_obj.get_estimate_room(room_id)
        if not fresh_room:
            raise HTTPException(status_code=500, detail="Room update failed")
        return await _estimate_room_detail(storage_obj, fresh_room)

    @app.delete("/api/calculator/rooms/{room_id}")
    async def delete_calculator_room(request: Request, room_id: int) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        room = await storage_obj.get_estimate_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Calculator room not found")
        project_id = int(room["project_id"])
        await storage_obj.delete_estimate_room(room_id)
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project not found after room deletion")
        return await _estimate_project_payload(storage_obj, project)
