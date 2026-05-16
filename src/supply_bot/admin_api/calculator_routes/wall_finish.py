from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
    require_estimate_project,
)
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.create_wall_finish_catalog import (
    CreateWallFinishCoveringCommand,
    CreateWallFinishCoveringConsumableCommand,
    CreateWallFinishCoveringUseCase,
    CreateWallFinishLayoutCommand,
    CreateWallFinishLayoutUseCase,
    CreateWallFinishPreparationCommand,
    CreateWallFinishPreparationUseCase,
)
from supply_bot.estimates.application.update_wall_finish import (
    UpdateWallFinishCommand,
    UpdateWallFinishRoomCommand,
    UpdateWallFinishRoomZoneCommand,
    UpdateWallFinishUseCase,
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
        command = CreateWallFinishCoveringCommand(
            title=payload.title,
            material_price_per_m2=payload.material_price_per_m2,
            labor_price_per_m2=payload.labor_price_per_m2,
            base_waste_percent=payload.base_waste_percent,
            glue_consumption_per_m2=payload.glue_consumption_per_m2,
            glue_unit=payload.glue_unit,
            glue_price_per_unit=payload.glue_price_per_unit,
            primer_consumption_per_m2=payload.primer_consumption_per_m2,
            primer_unit=payload.primer_unit,
            primer_price_per_unit=payload.primer_price_per_unit,
            putty_consumption_per_m2=payload.putty_consumption_per_m2,
            putty_unit=payload.putty_unit,
            putty_price_per_unit=payload.putty_price_per_unit,
            mesh_consumption_per_m2=payload.mesh_consumption_per_m2,
            mesh_unit=payload.mesh_unit,
            mesh_price_per_unit=payload.mesh_price_per_unit,
            custom_consumables=[
                CreateWallFinishCoveringConsumableCommand(
                    title=item.title,
                    consumption_per_m2=item.consumption_per_m2,
                    unit=item.unit,
                    price_per_unit=item.price_per_unit,
                )
                for item in payload.custom_consumables
            ],
            instrument_price_per_m2=payload.instrument_price_per_m2,
            note=payload.note,
        )
        covering_id = await resolve_application_result(CreateWallFinishCoveringUseCase(storage_obj).execute(command))

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
        command = CreateWallFinishPreparationCommand(
            title=payload.title,
            labor_price_per_m2=payload.labor_price_per_m2,
            material_price_per_m2=payload.material_price_per_m2,
            primer_consumption_per_m2=payload.primer_consumption_per_m2,
            primer_unit=payload.primer_unit,
            primer_price_per_unit=payload.primer_price_per_unit,
            note=payload.note,
        )
        preparation_id = await resolve_application_result(
            CreateWallFinishPreparationUseCase(storage_obj).execute(command)
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
        command = CreateWallFinishLayoutCommand(
            title=payload.title,
            labor_multiplier=payload.labor_multiplier,
            extra_waste_percent=payload.extra_waste_percent,
            note=payload.note,
        )
        layout_id = await resolve_application_result(CreateWallFinishLayoutUseCase(storage_obj).execute(command))

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
        command = UpdateWallFinishCommand(
            project_id=project_id,
            rooms_snapshot=project_snapshot["rooms"],
            include_preparation=payload.include_preparation,
            include_demolition=payload.include_demolition,
            demolition_price_per_m2=payload.demolition_price_per_m2,
            rooms=[
                UpdateWallFinishRoomCommand(
                    room_id=room_payload.room_id,
                    selected=room_payload.selected,
                    covering_id=room_payload.covering_id,
                    preparation_id=room_payload.preparation_id,
                    layout_id=room_payload.layout_id,
                    area_m2_override=room_payload.area_m2_override,
                    note=room_payload.note,
                    zones=[
                        UpdateWallFinishRoomZoneCommand(
                            covering_id=zone.covering_id,
                            preparation_id=zone.preparation_id,
                            layout_id=zone.layout_id,
                            area_m2=zone.area_m2,
                            note=zone.note,
                        )
                        for zone in room_payload.zones
                    ],
                )
                for room_payload in payload.rooms
            ],
        )
        project_id = await resolve_application_result(UpdateWallFinishUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after wall finish update",
        )
