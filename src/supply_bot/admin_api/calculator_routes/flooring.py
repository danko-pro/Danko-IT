from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    get_global_estimate_catalog_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
)
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringCommand,
    CreateFlooringCoveringConsumableCommand,
    CreateFlooringCoveringUseCase,
    CreateFlooringLayoutCommand,
    CreateFlooringLayoutUseCase,
    CreateFlooringPreparationCommand,
    CreateFlooringPreparationUseCase,
)
from supply_bot.estimates.application.flooring_assembly_catalog import (
    CreateFlooringAssemblyItemUseCase,
    FlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemUseCase,
)
from supply_bot.estimates.application.update_flooring import (
    UpdateFlooringCommand,
    UpdateFlooringGlobalItemCommand,
    UpdateFlooringRoomCommand,
    UpdateFlooringRoomZoneCommand,
    UpdateFlooringUseCase,
)
from supply_bot.estimates.application.update_flooring_catalog import (
    UpdateFlooringCoveringCommand,
    UpdateFlooringCoveringUseCase,
    UpdateFlooringLayoutCommand,
    UpdateFlooringLayoutUseCase,
    UpdateFlooringPreparationCommand,
    UpdateFlooringPreparationUseCase,
)


def register_calculator_flooring_routes(
    app: FastAPI,
    *,
    calculator_flooring_assembly_item_payload_model,
    calculator_flooring_covering_payload_model,
    calculator_flooring_preparation_payload_model,
    calculator_flooring_layout_payload_model,
    calculator_flooring_update_payload_model,
) -> None:
    @app.get("/api/calculator/flooring/assembly-items")
    async def list_calculator_flooring_assembly_items(
        request: Request,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_global_estimate_catalog_storage(request)
        return await storage_obj.list_estimate_flooring_assembly_items()

    @app.post("/api/calculator/flooring/assembly-items")
    async def create_calculator_flooring_assembly_item(
        request: Request,
        payload: calculator_flooring_assembly_item_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = FlooringAssemblyItemCommand(
            source_code=payload.source_code,
            section=payload.section,
            title=payload.title,
            kind=payload.kind,
            formula=payload.formula,
            unit=payload.unit,
            price=payload.price,
            consumption_per_m2=payload.consumption_per_m2,
            package_size=payload.package_size,
            layer_mm=payload.layer_mm,
            note=payload.note,
            sort_order=payload.sort_order,
        )
        item_id = await resolve_application_result(CreateFlooringAssemblyItemUseCase(storage_obj).execute(command))
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_assembly_items,
            created_id=item_id,
            detail="Flooring assembly item was not created",
        )

    @app.patch("/api/calculator/flooring/assembly-items/{item_id}")
    async def update_calculator_flooring_assembly_item(
        request: Request,
        item_id: int,
        payload: calculator_flooring_assembly_item_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = UpdateFlooringAssemblyItemCommand(
            source_code=payload.source_code,
            section=payload.section,
            title=payload.title,
            kind=payload.kind,
            formula=payload.formula,
            unit=payload.unit,
            price=payload.price,
            consumption_per_m2=payload.consumption_per_m2,
            package_size=payload.package_size,
            layer_mm=payload.layer_mm,
            note=payload.note,
            sort_order=payload.sort_order,
            item_id=item_id,
        )
        return await resolve_application_result(UpdateFlooringAssemblyItemUseCase(storage_obj).execute(command))

    @app.get("/api/calculator/flooring/coverings")
    async def list_calculator_flooring_coverings(
        request: Request,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_global_estimate_catalog_storage(request)
        return await storage_obj.list_estimate_flooring_coverings()

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
        covering_id = await resolve_application_result(CreateFlooringCoveringUseCase(storage_obj).execute(command))

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_coverings,
            created_id=covering_id,
            detail="Floor covering catalog item was not created",
        )

    @app.patch("/api/calculator/flooring/coverings/{covering_id}")
    async def update_calculator_flooring_covering(
        request: Request,
        covering_id: int,
        payload: calculator_flooring_covering_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = UpdateFlooringCoveringCommand(
            covering_id=covering_id,
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
        return await resolve_application_result(UpdateFlooringCoveringUseCase(storage_obj).execute(command))

    @app.get("/api/calculator/flooring/preparations")
    async def list_calculator_flooring_preparations(
        request: Request,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_global_estimate_catalog_storage(request)
        return await storage_obj.list_estimate_flooring_preparations()

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
        preparation_id = await resolve_application_result(
            CreateFlooringPreparationUseCase(storage_obj).execute(command)
        )

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_preparations,
            created_id=preparation_id,
            detail="Floor preparation catalog item was not created",
        )

    @app.patch("/api/calculator/flooring/preparations/{preparation_id}")
    async def update_calculator_flooring_preparation(
        request: Request,
        preparation_id: int,
        payload: calculator_flooring_preparation_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = UpdateFlooringPreparationCommand(
            preparation_id=preparation_id,
            title=payload.title,
            labor_price_per_m2=payload.labor_price_per_m2,
            material_price_per_m2=payload.material_price_per_m2,
            primer_consumption_per_m2=payload.primer_consumption_per_m2,
            primer_unit=payload.primer_unit,
            primer_price_per_unit=payload.primer_price_per_unit,
            note=payload.note,
        )
        return await resolve_application_result(UpdateFlooringPreparationUseCase(storage_obj).execute(command))

    @app.get("/api/calculator/flooring/layouts")
    async def list_calculator_flooring_layouts(
        request: Request,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_global_estimate_catalog_storage(request)
        return await storage_obj.list_estimate_flooring_layouts()

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
        layout_id = await resolve_application_result(CreateFlooringLayoutUseCase(storage_obj).execute(command))

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_layouts,
            created_id=layout_id,
            detail="Floor layout catalog item was not created",
        )

    @app.patch("/api/calculator/flooring/layouts/{layout_id}")
    async def update_calculator_flooring_layout(
        request: Request,
        layout_id: int,
        payload: calculator_flooring_layout_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = UpdateFlooringLayoutCommand(
            layout_id=layout_id,
            title=payload.title,
            labor_multiplier=payload.labor_multiplier,
            extra_waste_percent=payload.extra_waste_percent,
            note=payload.note,
        )
        return await resolve_application_result(UpdateFlooringLayoutUseCase(storage_obj).execute(command))

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
