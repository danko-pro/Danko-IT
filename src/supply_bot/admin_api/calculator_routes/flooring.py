from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
)
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringCommand,
    CreateFlooringCoveringConsumableCommand,
    CreateFlooringCoveringUseCase,
    CreateFlooringLayoutCommand,
    CreateFlooringLayoutUseCase,
    CreateFlooringPreparationCommand,
    CreateFlooringPreparationUseCase,
)
from supply_bot.estimates.application.update_flooring import (
    UpdateFlooringCommand,
    UpdateFlooringGlobalItemCommand,
    UpdateFlooringRoomCommand,
    UpdateFlooringRoomZoneCommand,
    UpdateFlooringUseCase,
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
        command = CreateFlooringCoveringCommand(
            title=payload.title,
            material_price_per_m2=payload.material_price_per_m2,
            labor_price_per_m2=payload.labor_price_per_m2,
            base_waste_percent=payload.base_waste_percent,
            underlay_mode=payload.underlay_mode,
            underlay_consumption_per_m2=payload.underlay_consumption_per_m2,
            glue_consumption_per_m2=payload.glue_consumption_per_m2,
            glue_unit=payload.glue_unit,
            glue_price_per_unit=payload.glue_price_per_unit,
            primer_consumption_per_m2=payload.primer_consumption_per_m2,
            primer_unit=payload.primer_unit,
            primer_price_per_unit=payload.primer_price_per_unit,
            svp_consumption_per_m2=payload.svp_consumption_per_m2,
            svp_unit=payload.svp_unit,
            svp_price_per_unit=payload.svp_price_per_unit,
            grout_consumption_per_m2=payload.grout_consumption_per_m2,
            grout_unit=payload.grout_unit,
            grout_price_per_unit=payload.grout_price_per_unit,
            custom_consumables=[
                CreateFlooringCoveringConsumableCommand(
                    title=item.title,
                    consumption_per_m2=item.consumption_per_m2,
                    unit=item.unit,
                    price_per_unit=item.price_per_unit,
                )
                for item in payload.custom_consumables
            ],
            needs_plinth=payload.needs_plinth,
            instrument_price_per_m2=payload.instrument_price_per_m2,
            note=payload.note,
        )
        try:
            covering_id = await CreateFlooringCoveringUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

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
        command = CreateFlooringPreparationCommand(
            title=payload.title,
            labor_price_per_m2=payload.labor_price_per_m2,
            material_price_per_m2=payload.material_price_per_m2,
            primer_consumption_per_m2=payload.primer_consumption_per_m2,
            primer_unit=payload.primer_unit,
            primer_price_per_unit=payload.primer_price_per_unit,
            note=payload.note,
        )
        try:
            preparation_id = await CreateFlooringPreparationUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

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
        command = CreateFlooringLayoutCommand(
            title=payload.title,
            labor_multiplier=payload.labor_multiplier,
            extra_waste_percent=payload.extra_waste_percent,
            note=payload.note,
        )
        try:
            layout_id = await CreateFlooringLayoutUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

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
        command = UpdateFlooringCommand(
            project_id=project_id,
            include_underlay=payload.include_underlay,
            include_plinth=payload.include_plinth,
            include_demolition=payload.include_demolition,
            include_preparation=payload.include_preparation,
            default_preparation_id=payload.default_preparation_id,
            demolition_price_per_m2=payload.demolition_price_per_m2,
            underlay_price_per_m2=payload.underlay_price_per_m2,
            plinth_material_price_per_m=payload.plinth_material_price_per_m,
            plinth_install_price_per_m=payload.plinth_install_price_per_m,
            threshold_profile_count=payload.threshold_profile_count,
            threshold_profile_price=payload.threshold_profile_price,
            global_items=[
                UpdateFlooringGlobalItemCommand(
                    kind=item.kind,
                    title=item.title,
                    mode=item.mode,
                    rate=item.rate,
                    quantity=item.quantity,
                    enabled=item.enabled,
                )
                for item in payload.global_items
            ],
            rooms=[
                UpdateFlooringRoomCommand(
                    room_id=room_payload.room_id,
                    selected=room_payload.selected,
                    covering_id=room_payload.covering_id,
                    preparation_id=room_payload.preparation_id,
                    layout_id=room_payload.layout_id,
                    area_m2_override=room_payload.area_m2_override,
                    perimeter_m_override=room_payload.perimeter_m_override,
                    plinth_m_override=room_payload.plinth_m_override,
                    note=room_payload.note,
                    zones=[
                        UpdateFlooringRoomZoneCommand(
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
        try:
            await UpdateFlooringUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator project not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after flooring update",
        )
