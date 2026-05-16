from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_routes.doors_support import (
    resolve_project_door_component_values,
    resolve_project_door_values,
)
from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
    require_estimate_project,
    resolve_estimate_project_id_for_door,
)
from supply_bot.estimates.application.door_catalog import (
    CreateDoorCatalogItemCommand,
    CreateDoorCatalogItemUseCase,
    CreateDoorComponentCatalogItemCommand,
    CreateDoorComponentCatalogItemUseCase,
    ListDoorCatalogUseCase,
    ListDoorComponentCatalogUseCase,
)


def register_calculator_door_routes(
    app: FastAPI,
    *,
    calculator_door_catalog_payload_model,
    calculator_door_component_catalog_payload_model,
    calculator_project_door_payload_model,
    calculator_project_door_component_payload_model,
) -> None:
    @app.get("/api/calculator/door-catalog")
    async def calculator_door_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListDoorCatalogUseCase(storage_obj).execute()

    @app.post("/api/calculator/door-catalog")
    async def create_calculator_door_catalog_item(
        request: Request,
        payload: calculator_door_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateDoorCatalogItemCommand(
            title=payload.title,
            width_mm=payload.width_mm,
            height_mm=payload.height_mm,
            thickness_mm=payload.thickness_mm,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            install_price=payload.install_price,
            note=payload.note,
        )
        try:
            door_id = await CreateDoorCatalogItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return await load_created_catalog_item(
            storage_obj.list_estimate_door_catalog,
            created_id=door_id,
            detail="Door catalog item was not created",
        )

    @app.get("/api/calculator/door-component-catalog")
    async def calculator_door_component_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListDoorComponentCatalogUseCase(storage_obj).execute()

    @app.post("/api/calculator/door-component-catalog")
    async def create_calculator_door_component_catalog_item(
        request: Request,
        payload: calculator_door_component_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateDoorComponentCatalogItemCommand(
            category_code=payload.category_code,
            title=payload.title,
            unit=payload.unit,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            note=payload.note,
        )
        try:
            component_id = await CreateDoorComponentCatalogItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return await load_created_catalog_item(
            storage_obj.list_estimate_door_component_catalog,
            created_id=component_id,
            detail="Door component catalog item was not created",
        )
    @app.post("/api/calculator/projects/{project_id}/doors")
    async def create_calculator_project_door(
        request: Request,
        project_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        door_values = await resolve_project_door_values(storage_obj, payload)
        await storage_obj.create_estimate_project_door(project_id=project_id, **door_values)
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after door creation",
        )

    @app.patch("/api/calculator/project-doors/{door_id}")
    async def update_calculator_project_door(
        request: Request,
        door_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.update_estimate_project_door(
            door_id,
            **(await resolve_project_door_values(storage_obj, payload)),
        )
        if project_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after door update",
        )

    @app.delete("/api/calculator/project-doors/{door_id}")
    async def delete_calculator_project_door(request: Request, door_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.delete_estimate_project_door(door_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after door deletion",
        )

    @app.post("/api/calculator/project-doors/{door_id}/components")
    async def create_calculator_project_door_component(
        request: Request,
        door_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        component_id = await storage_obj.create_estimate_project_door_component(
            project_door_id=door_id,
            **(await resolve_project_door_component_values(storage_obj, payload)),
        )
        if component_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        project_id = await resolve_estimate_project_id_for_door(
            storage_obj,
            door_id,
            detail="Project not found after component creation",
        )
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component creation",
        )

    @app.patch("/api/calculator/door-components/{component_id}")
    async def update_calculator_project_door_component(
        request: Request,
        component_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.update_estimate_project_door_component(
            component_id,
            **(await resolve_project_door_component_values(storage_obj, payload)),
        )
        if project_id is None:
            raise HTTPException(status_code=404, detail="Door component not found")
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component update",
        )

    @app.delete("/api/calculator/door-components/{component_id}")
    async def delete_calculator_project_door_component(request: Request, component_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.delete_estimate_project_door_component(component_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Door component not found")
        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component deletion",
        )
