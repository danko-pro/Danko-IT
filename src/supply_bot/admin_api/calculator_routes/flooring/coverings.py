"""Flooring coverings catalog routes (GET, POST, PATCH, DELETE)."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.shared import get_global_estimate_catalog_storage
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.schemas.calculator_flooring import CalculatorFlooringCoveringFromAssemblyPayload
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringCoveringCommand,
    CreateFlooringCoveringConsumableCommand,
    CreateFlooringCoveringUseCase,
)
from supply_bot.estimates.application.create_flooring_catalog_from_assembly import (
    CreateFlooringCatalogFromAssemblyCommand,
    CreateFlooringCatalogFromAssemblyUseCase,
    CreateFlooringCatalogFromFlatBootstrapCommand,
    CreateFlooringCatalogFromFlatBootstrapUseCase,
)
from supply_bot.estimates.application.flooring_catalog_assembly import FlooringCatalogAssemblyRowCommand
from supply_bot.estimates.application.update_flooring_catalog import (
    UpdateFlooringCoveringCommand,
    UpdateFlooringCoveringUseCase,
)


def _covering_command_from_payload(payload) -> CreateFlooringCoveringCommand:
    """Build CreateFlooringCoveringCommand from payload."""
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


def _assembly_row_commands_from_payload(payload) -> list[FlooringCatalogAssemblyRowCommand]:
    """Build assembly row commands from payload."""
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


async def load_created_covering(
    storage_obj: Any,
    created_id: int,
) -> dict[str, Any]:
    """Load created covering from list."""
    coverings = await storage_obj.list_estimate_flooring_coverings()
    covering = next((c for c in coverings if int(c["id"]) == created_id), None)
    if not covering:
        raise HTTPException(status_code=500, detail="Floor covering catalog item was not created")
    return covering


def register_coverings_routes(
    app: FastAPI,
    *,
    calculator_flooring_covering_payload_model,
) -> None:
    """Register flooring coverings catalog routes."""

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
        return await load_created_covering(storage_obj, covering_id)

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
        return await load_created_covering(storage_obj, covering_id)

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
        return await load_created_covering(storage_obj, covering_id)

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
