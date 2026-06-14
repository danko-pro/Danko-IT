"""Flooring assembly items routes (GET, POST, PATCH, DELETE)."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.shared import get_global_estimate_catalog_storage
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.flooring_assembly_catalog import (
    CreateFlooringAssemblyItemUseCase,
    FlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemCommand,
    UpdateFlooringAssemblyItemUseCase,
)


async def load_created_assembly_item(
    storage_obj: Any,
    created_id: int,
) -> dict[str, Any]:
    """Load created assembly item from list."""
    items = await storage_obj.list_estimate_flooring_assembly_items()
    item = next((i for i in items if int(i["id"]) == created_id), None)
    if not item:
        raise HTTPException(status_code=500, detail="Flooring assembly item was not created")
    return item


def register_assembly_routes(
    app: FastAPI,
    *,
    calculator_flooring_assembly_item_payload_model,
) -> None:
    """Register flooring assembly item routes."""

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
        return await load_created_assembly_item(storage_obj, item_id)

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
