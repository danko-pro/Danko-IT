from typing import Any, Mapping

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_routes.shared import (
    find_catalog_item,
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


async def _resolve_door_catalog_item(
    storage_obj,
    door_catalog_id: int | None,
) -> Mapping[str, Any] | None:
    if door_catalog_id is None:
        return None
    catalog = await storage_obj.list_estimate_door_catalog()
    return find_catalog_item(catalog, item_id=door_catalog_id, detail="Door catalog item not found")


async def _resolve_component_catalog_item(
    storage_obj,
    component_catalog_id: int | None,
) -> Mapping[str, Any] | None:
    if component_catalog_id is None:
        return None
    catalog = await storage_obj.list_estimate_door_component_catalog()
    return find_catalog_item(
        catalog,
        item_id=component_catalog_id,
        detail="Door component catalog item not found",
    )


async def _resolve_project_door_values(storage_obj, payload) -> dict[str, Any]:
    catalog_item = await _resolve_door_catalog_item(storage_obj, payload.door_catalog_id)

    title = normalize_optional_text(payload.title)
    width_mm = payload.width_mm
    height_mm = payload.height_mm
    thickness_mm = payload.thickness_mm
    purchase_price = payload.purchase_price
    sale_price = payload.sale_price
    install_price = payload.install_price

    if catalog_item is not None:
        title = title or str(catalog_item["title"])
        width_mm = float(catalog_item["width_mm"])
        height_mm = float(catalog_item["height_mm"])
        thickness_mm = catalog_item["thickness_mm"]

    if payload.room_a_id is None and payload.room_b_id is None:
        raise HTTPException(status_code=400, detail="At least one room must be selected")

    return {
        "door_catalog_id": payload.door_catalog_id,
        "title": require_non_empty_text(title, detail="Door title is required"),
        "opening_kind": payload.opening_kind.strip() or "door",
        "width_mm": require_positive_number(width_mm, detail="Door width and height must be positive"),
        "height_mm": require_positive_number(height_mm, detail="Door width and height must be positive"),
        "thickness_mm": float(thickness_mm) if thickness_mm is not None else None,
        "purchase_price": float(purchase_price) if purchase_price is not None else None,
        "sale_price": float(sale_price) if sale_price is not None else None,
        "install_price": float(install_price) if install_price is not None else None,
        "room_a_id": payload.room_a_id,
        "room_b_id": payload.room_b_id,
        "note": normalize_optional_text(payload.note),
    }


async def _resolve_project_door_component_values(storage_obj, payload) -> dict[str, Any]:
    catalog_item = await _resolve_component_catalog_item(storage_obj, payload.component_catalog_id)

    category_code = normalize_text(payload.category_code or "")
    title = normalize_optional_text(payload.title)
    unit = normalize_optional_text(payload.unit)
    purchase_price = payload.purchase_price
    sale_price = payload.sale_price

    if catalog_item is not None:
        category_code = category_code or str(catalog_item["category_code"])
        title = title or str(catalog_item["title"])
        unit = unit or str(catalog_item["unit"] or "шт")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Door component quantity must be positive")

    return {
        "component_catalog_id": payload.component_catalog_id,
        "category_code": normalize_text(category_code) or "misc",
        "title": require_non_empty_text(title, detail="Door component title is required"),
        "unit": unit or "шт",
        "quantity": float(payload.quantity),
        "purchase_price": float(purchase_price) if purchase_price is not None else None,
        "sale_price": float(sale_price) if sale_price is not None else None,
        "note": normalize_optional_text(payload.note),
    }


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
            unit=payload.unit.strip() or "шт",
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
        door_values = await _resolve_project_door_values(storage_obj, payload)
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
            **(await _resolve_project_door_values(storage_obj, payload)),
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
            **(await _resolve_project_door_component_values(storage_obj, payload)),
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
            **(await _resolve_project_door_component_values(storage_obj, payload)),
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
