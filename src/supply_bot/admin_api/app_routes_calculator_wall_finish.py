# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _estimate_project_payload
from supply_bot.storage import BotStorage


def register_calculator_wall_finish_routes(
    app: FastAPI,
    *,
    calculator_wall_finish_covering_payload_model,
    calculator_wall_finish_preparation_payload_model,
    calculator_wall_finish_layout_payload_model,
    calculator_wall_finish_update_payload_model,
) -> None:
    # Отделка стен идёт отдельным модулем, чтобы не смешивать её с полами и дверями.
    @app.post("/api/calculator/wall-finishes/coverings")
    async def create_calculator_wall_finish_covering(
        request: Request,
        payload: calculator_wall_finish_covering_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Wall finish title is required")
        covering_id = await storage_obj.create_estimate_wall_finish_covering(
            title=title,
            material_price_per_m2=max(0, payload.material_price_per_m2),
            labor_price_per_m2=max(0, payload.labor_price_per_m2),
            base_waste_percent=max(0, payload.base_waste_percent),
            glue_consumption_per_m2=max(0, payload.glue_consumption_per_m2),
            glue_unit=payload.glue_unit.strip() or "кг",
            glue_price_per_unit=max(0, payload.glue_price_per_unit),
            primer_consumption_per_m2=max(0, payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=max(0, payload.primer_price_per_unit),
            putty_consumption_per_m2=max(0, payload.putty_consumption_per_m2),
            putty_unit=payload.putty_unit.strip() or "кг",
            putty_price_per_unit=max(0, payload.putty_price_per_unit),
            mesh_consumption_per_m2=max(0, payload.mesh_consumption_per_m2),
            mesh_unit=payload.mesh_unit.strip() or "м²",
            mesh_price_per_unit=max(0, payload.mesh_price_per_unit),
            instrument_price_per_m2=max(0, payload.instrument_price_per_m2),
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        catalog = await storage_obj.list_estimate_wall_finish_coverings()
        created = next((item for item in catalog if int(item["id"]) == covering_id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Wall finish catalog item was not created")
        return created

    @app.post("/api/calculator/wall-finishes/preparations")
    async def create_calculator_wall_finish_preparation(
        request: Request,
        payload: calculator_wall_finish_preparation_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Wall preparation title is required")
        preparation_id = await storage_obj.create_estimate_wall_finish_preparation(
            title=title,
            labor_price_per_m2=max(0, payload.labor_price_per_m2),
            material_price_per_m2=max(0, payload.material_price_per_m2),
            primer_consumption_per_m2=max(0, payload.primer_consumption_per_m2),
            primer_unit=payload.primer_unit.strip() or "л",
            primer_price_per_unit=max(0, payload.primer_price_per_unit),
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        catalog = await storage_obj.list_estimate_wall_finish_preparations()
        created = next((item for item in catalog if int(item["id"]) == preparation_id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Wall preparation catalog item was not created")
        return created

    @app.post("/api/calculator/wall-finishes/layouts")
    async def create_calculator_wall_finish_layout(
        request: Request,
        payload: calculator_wall_finish_layout_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Wall layout title is required")
        layout_id = await storage_obj.create_estimate_wall_finish_layout(
            title=title,
            labor_multiplier=max(0.1, payload.labor_multiplier),
            extra_waste_percent=max(0, payload.extra_waste_percent),
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        catalog = await storage_obj.list_estimate_wall_finish_layouts()
        created = next((item for item in catalog if int(item["id"]) == layout_id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Wall layout catalog item was not created")
        return created

    @app.patch("/api/calculator/projects/{project_id}/wall-finishes")
    async def update_calculator_wall_finishes(
        request: Request,
        project_id: int,
        payload: calculator_wall_finish_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Calculator project not found")

        rooms = await storage_obj.list_estimate_rooms(project_id)
        room_ids = {int(room["id"]) for room in rooms}
        covering_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_coverings()}
        preparation_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_preparations()}
        layout_ids = {int(item["id"]) for item in await storage_obj.list_estimate_wall_finish_layouts()}

        rows: list[dict[str, Any]] = []
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
            rows.append(
                {
                    "room_id": room_id,
                    "covering_id": room_payload.covering_id,
                    "preparation_id": room_payload.preparation_id,
                    "layout_id": room_payload.layout_id,
                    "area_m2_override": room_payload.area_m2_override,
                    "note": room_payload.note.strip() if room_payload.note and room_payload.note.strip() else None,
                    "sort_order": index * 10,
                }
            )

        await storage_obj.update_estimate_wall_finish_config(
            project_id,
            include_preparation=payload.include_preparation,
            include_demolition=payload.include_demolition,
            demolition_price_per_m2=max(0, payload.demolition_price_per_m2),
        )
        await storage_obj.replace_estimate_wall_finish_rooms(project_id, rows)

        fresh_project = await storage_obj.get_estimate_project(project_id)
        if not fresh_project:
            raise HTTPException(status_code=500, detail="Project not found after wall finish update")
        return await _estimate_project_payload(storage_obj, fresh_project)
