"""Flooring estimates/project update routes."""

from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_estimate_project_payload,
)
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.update_flooring import (
    UpdateFlooringCommand,
    UpdateFlooringGlobalItemCommand,
    UpdateFlooringRoomCommand,
    UpdateFlooringRoomZoneCommand,
    UpdateFlooringUseCase,
)


def register_estimates_routes(
    app: FastAPI,
    *,
    calculator_flooring_update_payload_model,
) -> None:
    """Register flooring estimate/project update routes."""

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
        project_id = await resolve_application_result(UpdateFlooringUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after flooring update",
        )
