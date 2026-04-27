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
    normalize_optional_text,
    require_estimate_project,
    require_non_empty_text,
    require_positive_number,
    resolve_estimate_project_id_for_door,
)
from supply_bot.utils import normalize_text


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
        return await storage_obj.list_estimate_door_catalog()

    @app.post("/api/calculator/door-catalog")
    async def create_calculator_door_catalog_item(
        request: Request,
        payload: calculator_door_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        door_id = await storage_obj.create_estimate_door_catalog_item(
            title=require_non_empty_text(payload.title, detail="Door title is required"),
            width_mm=require_positive_number(payload.width_mm, detail="Door width and height must be positive"),
            height_mm=require_positive_number(payload.height_mm, detail="Door width and height must be positive"),
            thickness_mm=payload.thickness_mm,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            install_price=payload.install_price,
            note=normalize_optional_text(payload.note),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_door_catalog,
            created_id=door_id,
            detail="Door catalog item was not created",
        )

    @app.get("/api/calculator/door-component-catalog")
    async def calculator_door_component_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await storage_obj.list_estimate_door_component_catalog()

    @app.post("/api/calculator/door-component-catalog")
    async def create_calculator_door_component_catalog_item(
        request: Request,
        payload: calculator_door_component_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        component_id = await storage_obj.create_estimate_door_component_catalog_item(
            category_code=normalize_text(payload.category_code) or "misc",
            title=require_non_empty_text(payload.title, detail="Door component title is required"),
            unit=payload.unit.strip() or "С€С‚",
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            note=normalize_optional_text(payload.note),
        )
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
        return await load_estimate_project_payload(storage_obj, project_id, detail="Project not found after door creation")

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
        return await load_estimate_project_payload(storage_obj, project_id, detail="Project not found after door update")

    @app.delete("/api/calculator/project-doors/{door_id}")
    async def delete_calculator_project_door(request: Request, door_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.delete_estimate_project_door(door_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        return await load_estimate_project_payload(storage_obj, project_id, detail="Project not found after door deletion")

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
