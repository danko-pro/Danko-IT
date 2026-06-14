"""Flooring preparations catalog routes (GET, POST, PATCH, DELETE)."""

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.calculator_routes.flooring.coverings import _assembly_row_commands_from_payload
from supply_bot.admin_api.calculator_routes.shared import get_global_estimate_catalog_storage
from supply_bot.admin_api.deps import require_admin_role_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.schemas.calculator_flooring import CalculatorFlooringPreparationFromAssemblyPayload
from supply_bot.estimates.application.create_flooring_catalog import (
    CreateFlooringPreparationCommand,
    CreateFlooringPreparationUseCase,
)
from supply_bot.estimates.application.create_flooring_catalog_from_assembly import (
    CreateFlooringCatalogFromAssemblyCommand,
    CreateFlooringCatalogFromAssemblyUseCase,
    CreateFlooringCatalogFromFlatBootstrapCommand,
    CreateFlooringCatalogFromFlatBootstrapUseCase,
)
from supply_bot.estimates.application.update_flooring_catalog import (
    UpdateFlooringPreparationCommand,
    UpdateFlooringPreparationUseCase,
)


def _preparation_command_from_payload(payload) -> CreateFlooringPreparationCommand:
    """Build CreateFlooringPreparationCommand from payload."""
    return CreateFlooringPreparationCommand(
        title=payload.title,
        labor_price_per_m2=payload.labor_price_per_m2,
        material_price_per_m2=payload.material_price_per_m2,
        primer_consumption_per_m2=payload.primer_consumption_per_m2,
        primer_unit=payload.primer_unit,
        primer_price_per_unit=payload.primer_price_per_unit,
        note=payload.note,
    )


async def load_created_preparation(
    storage_obj: Any,
    created_id: int,
) -> dict[str, Any]:
    """Load created preparation from list."""
    preps = await storage_obj.list_estimate_flooring_preparations()
    prep = next((p for p in preps if int(p["id"]) == created_id), None)
    if not prep:
        raise HTTPException(status_code=500, detail="Floor preparation catalog item was not created")
    return prep


def register_preparations_routes(
    app: FastAPI,
    *,
    calculator_flooring_preparation_payload_model,
) -> None:
    """Register flooring preparations catalog routes."""

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
        return await load_created_preparation(storage_obj, preparation_id)

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
        return await load_created_preparation(storage_obj, preparation_id)

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
        return await load_created_preparation(storage_obj, preparation_id)

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
