"""Flooring catalog assembly management routes (GET, PUT, DELETE)."""

from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.shared import get_global_estimate_catalog_storage
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.flooring_catalog_assembly import (
    DeleteFlooringCatalogAssemblyUseCase,
    FlooringCatalogAssemblyRowCommand,
    GetFlooringCatalogAssemblyUseCase,
    ReplaceFlooringCatalogAssemblyCommand,
    ReplaceFlooringCatalogAssemblyUseCase,
)


def register_assembly_mgmt_routes(
    app: FastAPI,
    *,
    calculator_flooring_catalog_assembly_replace_payload_model,
) -> None:
    """Register flooring assembly management routes."""

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
