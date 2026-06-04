from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    get_global_estimate_catalog_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
)
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.schemas.calculator_flooring import (
    CalculatorFlooringCoveringFromAssemblyPayload,
    CalculatorFlooringLayoutFromAssemblyPayload,
    CalculatorFlooringPreparationFromAssemblyPayload,
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
from supply_bot.estimates.application.create_flooring_catalog_from_assembly import (
    CreateFlooringCatalogFromAssemblyCommand,
    CreateFlooringCatalogFromAssemblyUseCase,
    CreateFlooringCatalogFromFlatBootstrapCommand,
    CreateFlooringCatalogFromFlatBootstrapUseCase,
)
from supply_bot.estimates.application.flooring_assembly_catalog import (
    CreateFlooringAssemblyItemUseCase,
    FlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemUseCase,
)
from supply_bot.estimates.application.flooring_catalog_assembly import (
    DeleteFlooringCatalogAssemblyUseCase,
    FlooringCatalogAssemblyRowCommand,
    GetFlooringCatalogAssemblyUseCase,
    ReplaceFlooringCatalogAssemblyCommand,
    ReplaceFlooringCatalogAssemblyUseCase,
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


def _covering_command_from_payload(payload) -> CreateFlooringCoveringCommand:
    return CreateFlooringCoveringCommand(
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


def _preparation_command_from_payload(payload) -> CreateFlooringPreparationCommand:
    return CreateFlooringPreparationCommand(
        title=payload.title,
        labor_price_per_m2=payload.labor_price_per_m2,
        material_price_per_m2=payload.material_price_per_m2,
        primer_consumption_per_m2=payload.primer_consumption_per_m2,
        primer_unit=payload.primer_unit,
        primer_price_per_unit=payload.primer_price_per_unit,
        note=payload.note,
    )


def _layout_command_from_payload(payload) -> CreateFlooringLayoutCommand:
    return CreateFlooringLayoutCommand(
        title=payload.title,
        labor_price_per_m2=payload.labor_price_per_m2,
        labor_multiplier=payload.labor_multiplier,
        extra_waste_percent=payload.extra_waste_percent,
        note=payload.note,
    )


def _assembly_row_commands_from_payload(payload) -> list[FlooringCatalogAssemblyRowCommand]:
    return [
        FlooringCatalogAssemblyRowCommand(
            assembly_item_id=row.assembly_item_id,
            section=row.section,
            kind=row.kind,
            formula=row.formula,
            title=row.title,
            unit=row.unit,
            price=row.price,
            consumption_per_m2=row.consumption_per_m2,
            package_size=row.package_size,
            layer_mm=row.layer_mm,
            sort_order=row.sort_order,
            is_enabled=row.is_enabled,
            public_category=row.public_category,
            public_title=row.public_title,
        )
        for row in payload.rows
    ]


def register_calculator_flooring_routes(
    app: FastAPI,
    *,
    calculator_flooring_assembly_item_payload_model,
    calculator_flooring_catalog_assembly_replace_payload_model,
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

    @app.delete("/api/calculator/flooring/assembly-items/{item_id}")
    async def delete_calculator_flooring_assembly_item(
        request: Request,
        item_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        deleted = await storage_obj.delete_estimate_flooring_assembly_item(item_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Flooring assembly item not found")
        return {"id": item_id, "deleted": True}

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
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = _covering_command_from_payload(payload)
        covering_id = await resolve_application_result(CreateFlooringCoveringUseCase(storage_obj).execute(command))

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_coverings,
            created_id=covering_id,
            detail="Floor covering catalog item was not created",
        )

    @app.post("/api/calculator/flooring/coverings/from-assembly")
    async def create_calculator_flooring_covering_from_assembly(
        request: Request,
        payload: CalculatorFlooringCoveringFromAssemblyPayload,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromAssemblyCommand(
            target_kind="covering",
            covering=_covering_command_from_payload(payload.catalog),
            assembly_title=payload.assembly.title,
            assembly_version=payload.assembly.version,
            assembly_rows=_assembly_row_commands_from_payload(payload.assembly),
        )
        covering_id = await resolve_application_result(
            CreateFlooringCatalogFromAssemblyUseCase(storage_obj).execute(command)
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_coverings,
            created_id=covering_id,
            detail="Floor covering catalog item was not created",
        )

    @app.post("/api/calculator/flooring/coverings/from-flat-bootstrap")
    async def create_calculator_flooring_covering_from_flat_bootstrap(
        request: Request,
        payload: calculator_flooring_covering_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromFlatBootstrapCommand(
            target_kind="covering",
            covering=_covering_command_from_payload(payload),
        )
        covering_id = await resolve_application_result(
            CreateFlooringCatalogFromFlatBootstrapUseCase(storage_obj).execute(command)
        )
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

    @app.delete("/api/calculator/flooring/coverings/{covering_id}")
    async def delete_calculator_flooring_covering(
        request: Request,
        covering_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        deleted = await storage_obj.delete_estimate_flooring_covering(covering_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Floor covering catalog item not found")
        return {"id": covering_id, "deleted": True}

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
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = _preparation_command_from_payload(payload)
        preparation_id = await resolve_application_result(
            CreateFlooringPreparationUseCase(storage_obj).execute(command)
        )

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_preparations,
            created_id=preparation_id,
            detail="Floor preparation catalog item was not created",
        )

    @app.post("/api/calculator/flooring/preparations/from-assembly")
    async def create_calculator_flooring_preparation_from_assembly(
        request: Request,
        payload: CalculatorFlooringPreparationFromAssemblyPayload,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromAssemblyCommand(
            target_kind="preparation",
            preparation=_preparation_command_from_payload(payload.catalog),
            assembly_title=payload.assembly.title,
            assembly_version=payload.assembly.version,
            assembly_rows=_assembly_row_commands_from_payload(payload.assembly),
        )
        preparation_id = await resolve_application_result(
            CreateFlooringCatalogFromAssemblyUseCase(storage_obj).execute(command)
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_preparations,
            created_id=preparation_id,
            detail="Floor preparation catalog item was not created",
        )

    @app.post("/api/calculator/flooring/preparations/from-flat-bootstrap")
    async def create_calculator_flooring_preparation_from_flat_bootstrap(
        request: Request,
        payload: calculator_flooring_preparation_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromFlatBootstrapCommand(
            target_kind="preparation",
            preparation=_preparation_command_from_payload(payload),
        )
        preparation_id = await resolve_application_result(
            CreateFlooringCatalogFromFlatBootstrapUseCase(storage_obj).execute(command)
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

    @app.delete("/api/calculator/flooring/preparations/{preparation_id}")
    async def delete_calculator_flooring_preparation(
        request: Request,
        preparation_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        deleted = await storage_obj.delete_estimate_flooring_preparation(preparation_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Floor preparation catalog item not found")
        return {"id": preparation_id, "deleted": True}

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
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = _layout_command_from_payload(payload)
        layout_id = await resolve_application_result(CreateFlooringLayoutUseCase(storage_obj).execute(command))

        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_layouts,
            created_id=layout_id,
            detail="Floor layout catalog item was not created",
        )

    @app.post("/api/calculator/flooring/layouts/from-assembly")
    async def create_calculator_flooring_layout_from_assembly(
        request: Request,
        payload: CalculatorFlooringLayoutFromAssemblyPayload,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromAssemblyCommand(
            target_kind="layout",
            layout=_layout_command_from_payload(payload.catalog),
            assembly_title=payload.assembly.title,
            assembly_version=payload.assembly.version,
            assembly_rows=_assembly_row_commands_from_payload(payload.assembly),
        )
        layout_id = await resolve_application_result(
            CreateFlooringCatalogFromAssemblyUseCase(storage_obj).execute(command)
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_flooring_layouts,
            created_id=layout_id,
            detail="Floor layout catalog item was not created",
        )

    @app.post("/api/calculator/flooring/layouts/from-flat-bootstrap")
    async def create_calculator_flooring_layout_from_flat_bootstrap(
        request: Request,
        payload: calculator_flooring_layout_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = CreateFlooringCatalogFromFlatBootstrapCommand(
            target_kind="layout",
            layout=_layout_command_from_payload(payload),
        )
        layout_id = await resolve_application_result(
            CreateFlooringCatalogFromFlatBootstrapUseCase(storage_obj).execute(command)
        )
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
            labor_price_per_m2=payload.labor_price_per_m2,
            labor_multiplier=payload.labor_multiplier,
            extra_waste_percent=payload.extra_waste_percent,
            note=payload.note,
        )
        return await resolve_application_result(UpdateFlooringLayoutUseCase(storage_obj).execute(command))

    @app.delete("/api/calculator/flooring/layouts/{layout_id}")
    async def delete_calculator_flooring_layout(
        request: Request,
        layout_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        deleted = await storage_obj.delete_estimate_flooring_layout(layout_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Floor layout catalog item not found")
        return {"id": layout_id, "deleted": True}

    @app.get("/api/calculator/flooring/{target_kind}/{target_id}/assembly")
    async def get_calculator_flooring_catalog_assembly(
        request: Request,
        target_kind: str,
        target_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        return await resolve_application_result(
            GetFlooringCatalogAssemblyUseCase(storage_obj).execute(target_kind, target_id)
        )

    @app.put("/api/calculator/flooring/{target_kind}/{target_id}/assembly")
    async def replace_calculator_flooring_catalog_assembly(
        request: Request,
        target_kind: str,
        target_id: int,
        payload: calculator_flooring_catalog_assembly_replace_payload_model,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        command = ReplaceFlooringCatalogAssemblyCommand(
            target_kind=target_kind,
            target_id=target_id,
            title=payload.title,
            version=payload.version,
            rows=[
                FlooringCatalogAssemblyRowCommand(
                    assembly_item_id=row.assembly_item_id,
                    section=row.section,
                    kind=row.kind,
                    formula=row.formula,
                    title=row.title,
                    unit=row.unit,
                    price=row.price,
                    consumption_per_m2=row.consumption_per_m2,
                    package_size=row.package_size,
                    layer_mm=row.layer_mm,
                    sort_order=row.sort_order,
                    is_enabled=row.is_enabled,
                    public_category=row.public_category,
                    public_title=row.public_title,
                )
                for row in payload.rows
            ],
        )
        return await resolve_application_result(
            ReplaceFlooringCatalogAssemblyUseCase(storage_obj).execute(command)
        )

    @app.delete("/api/calculator/flooring/{target_kind}/{target_id}/assembly")
    async def delete_calculator_flooring_catalog_assembly(
        request: Request,
        target_kind: str,
        target_id: int,
        _session: AdminSession = Depends(require_admin_role_session),
    ) -> dict[str, Any]:
        storage_obj = get_global_estimate_catalog_storage(request)
        await resolve_application_result(
            DeleteFlooringCatalogAssemblyUseCase(storage_obj).execute(target_kind, target_id)
        )
        return {"target_kind": target_kind, "target_id": target_id, "deleted": True}

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
