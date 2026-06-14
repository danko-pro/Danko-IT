"""Flooring layouts catalog routes (GET, POST, PATCH, DELETE)."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.flooring.coverings import _assembly_row_commands_from_payload
from supply_bot.admin_api.calculator_routes.shared import get_global_estimate_catalog_storage
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.schemas.calculator_flooring import CalculatorFlooringLayoutFromAssemblyPayload
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringLayoutCommand,
    CreateFlooringLayoutUseCase,
)
from supply_bot.estimates.application.create_flooring_catalog_from_assembly import (
    CreateFlooringCatalogFromAssemblyCommand,
    CreateFlooringCatalogFromAssemblyUseCase,
    CreateFlooringCatalogFromFlatBootstrapCommand,
    CreateFlooringCatalogFromFlatBootstrapUseCase,
)
from supply_bot.estimates.application.update_flooring_catalog import (
    UpdateFlooringLayoutCommand,
    UpdateFlooringLayoutUseCase,
)


def _layout_command_from_payload(payload) -> CreateFlooringLayoutCommand:
    """Build CreateFlooringLayoutCommand from payload."""
    return CreateFlooringLayoutCommand(
        title=payload.title,
        labor_price_per_m2=payload.labor_price_per_m2,
        labor_multiplier=payload.labor_multiplier,
        extra_waste_percent=payload.extra_waste_percent,
        note=payload.note,
    )


async def load_created_layout(
    storage_obj: Any,
    created_id: int,
) -> dict[str, Any]:
    """Load created layout from list."""
    layouts = await storage_obj.list_estimate_flooring_layouts()
    layout = next((row for row in layouts if int(row["id"]) == created_id), None)
    if not layout:
        raise HTTPException(status_code=500, detail="Floor layout catalog item was not created")
    return layout


def register_layouts_routes(
    app: FastAPI,
    *,
    calculator_flooring_layout_payload_model,
) -> None:
    """Register flooring layouts catalog routes."""

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
        return await load_created_layout(storage_obj, layout_id)

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
        return await load_created_layout(storage_obj, layout_id)

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
        return await load_created_layout(storage_obj, layout_id)

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
