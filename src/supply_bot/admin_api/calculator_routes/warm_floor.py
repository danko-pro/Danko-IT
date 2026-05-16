from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_estimate_project_payload,
)
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.update_warm_floor import (
    UpdateWarmFloorCommand,
    UpdateWarmFloorMaterialItemCommand,
    UpdateWarmFloorRoomCommand,
    UpdateWarmFloorUseCase,
)


def register_calculator_warm_floor_routes(
    app: FastAPI,
    *,
    calculator_warm_floor_update_payload_model,
) -> None:
    @app.patch("/api/calculator/projects/{project_id}/warm-floor")
    async def update_calculator_warm_floor(
        request: Request,
        project_id: int,
        payload: calculator_warm_floor_update_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = UpdateWarmFloorCommand(
            project_id=project_id,
            work_price_per_m2=payload.work_price_per_m2,
            pipe_m_per_m2=payload.pipe_m_per_m2,
            max_contour_area_m2=payload.max_contour_area_m2,
            small_zone_area_m2=payload.small_zone_area_m2,
            manifold_work_price=payload.manifold_work_price,
            manifold_material_price=payload.manifold_material_price,
            pump_work_price=payload.pump_work_price,
            pump_material_price=payload.pump_material_price,
            pipe_price_per_m=payload.pipe_price_per_m,
            pipe_material_title=payload.pipe_material_title,
            manifold_material_items=[
                UpdateWarmFloorMaterialItemCommand(
                    title=item.title,
                    unit=item.unit,
                    quantity=item.quantity,
                    amount=item.amount,
                )
                for item in payload.manifold_material_items
            ],
            pump_material_items=[
                UpdateWarmFloorMaterialItemCommand(
                    title=item.title,
                    unit=item.unit,
                    quantity=item.quantity,
                    amount=item.amount,
                )
                for item in payload.pump_material_items
            ],
            consumable_material_items=[
                UpdateWarmFloorMaterialItemCommand(
                    title=item.title,
                    unit=item.unit,
                    quantity=item.quantity,
                    amount=item.amount,
                )
                for item in payload.consumable_material_items
            ],
            pump_rooms_threshold=payload.pump_rooms_threshold,
            pump_contours_threshold=payload.pump_contours_threshold,
            rooms=[
                UpdateWarmFloorRoomCommand(
                    room_id=room.room_id,
                    selected=room.selected,
                    area_m2_override=room.area_m2_override,
                    note=room.note,
                )
                for room in payload.rooms
            ],
        )
        project_id = await resolve_application_result(UpdateWarmFloorUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after warm floor update",
        )
