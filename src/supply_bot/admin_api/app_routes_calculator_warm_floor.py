# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _estimate_project_payload
from supply_bot.storage import BotStorage


def register_calculator_warm_floor_routes(
    app: FastAPI,
    *,
    calculator_warm_floor_update_payload_model,
) -> None:
    # Контур теплого пола изолирован, чтобы не смешивать его с остальными модулями отделки.
    @app.patch("/api/calculator/projects/{project_id}/warm-floor")
    async def update_calculator_warm_floor(
        request: Request,
        project_id: int,
        payload: calculator_warm_floor_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Calculator project not found")

        if payload.work_price_per_m2 < 0 or payload.pipe_m_per_m2 < 0 or payload.pipe_price_per_m < 0:
            raise HTTPException(status_code=400, detail="Warm floor prices and consumption must be non-negative")
        if payload.max_contour_area_m2 <= 0 or payload.small_zone_area_m2 < 0:
            raise HTTPException(status_code=400, detail="Warm floor contour and zone parameters are invalid")
        if (
            payload.manifold_work_price < 0
            or payload.manifold_material_price < 0
            or payload.pump_work_price < 0
            or payload.pump_material_price < 0
        ):
            raise HTTPException(status_code=400, detail="Warm floor node prices must be non-negative")
        if payload.pump_rooms_threshold < 1 or payload.pump_contours_threshold < 1:
            raise HTTPException(status_code=400, detail="Pump thresholds must be positive integers")

        rooms = await storage_obj.list_estimate_rooms(project_id)
        room_ids = {int(room["id"]) for room in rooms}
        selected_rows: list[dict[str, Any]] = []
        seen_room_ids: set[int] = set()
        for index, room_payload in enumerate(payload.rooms, start=1):
            room_id = int(room_payload.room_id)
            if room_id in seen_room_ids or room_id not in room_ids or not room_payload.selected:
                continue
            seen_room_ids.add(room_id)
            area_override = room_payload.area_m2_override
            if area_override is not None and area_override < 0:
                raise HTTPException(status_code=400, detail="Warm floor area override cannot be negative")
            selected_rows.append(
                {
                    "room_id": room_id,
                    "area_m2_override": area_override,
                    "note": room_payload.note.strip() if room_payload.note and room_payload.note.strip() else None,
                    "sort_order": index * 10,
                }
            )

        await storage_obj.update_estimate_warm_floor_config(
            project_id,
            work_price_per_m2=float(payload.work_price_per_m2),
            pipe_m_per_m2=float(payload.pipe_m_per_m2),
            max_contour_area_m2=float(payload.max_contour_area_m2),
            small_zone_area_m2=float(payload.small_zone_area_m2),
            manifold_work_price=float(payload.manifold_work_price),
            manifold_material_price=float(payload.manifold_material_price),
            pump_work_price=float(payload.pump_work_price),
            pump_material_price=float(payload.pump_material_price),
            pipe_price_per_m=float(payload.pipe_price_per_m),
            pump_rooms_threshold=int(payload.pump_rooms_threshold),
            pump_contours_threshold=int(payload.pump_contours_threshold),
        )
        await storage_obj.replace_estimate_warm_floor_rooms(project_id, selected_rows)

        fresh_project = await storage_obj.get_estimate_project(project_id)
        if not fresh_project:
            raise HTTPException(status_code=500, detail="Project not found after warm floor update")
        return await _estimate_project_payload(storage_obj, fresh_project)
