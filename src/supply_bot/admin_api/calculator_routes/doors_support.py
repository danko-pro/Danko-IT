from typing import Any, Mapping

from fastapi import HTTPException

from supply_bot.admin_api.calculator_routes.shared import (
    find_catalog_item,
    normalize_optional_text,
    require_non_empty_text,
    require_positive_number,
)
from supply_bot.utils import normalize_text


async def resolve_door_catalog_item(
    storage_obj,
    door_catalog_id: int | None,
) -> Mapping[str, Any] | None:
    if door_catalog_id is None:
        return None
    catalog = await storage_obj.list_estimate_door_catalog()
    return find_catalog_item(catalog, item_id=door_catalog_id, detail="Door catalog item not found")


async def resolve_component_catalog_item(
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


async def resolve_project_door_values(storage_obj, payload) -> dict[str, Any]:
    catalog_item = await resolve_door_catalog_item(storage_obj, payload.door_catalog_id)
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


async def resolve_project_door_component_values(storage_obj, payload) -> dict[str, Any]:
    catalog_item = await resolve_component_catalog_item(storage_obj, payload.component_catalog_id)
    category_code = normalize_text(payload.category_code or "")
    title = normalize_optional_text(payload.title)
    unit = normalize_optional_text(payload.unit)
    purchase_price = payload.purchase_price
    sale_price = payload.sale_price

    if catalog_item is not None:
        category_code = category_code or str(catalog_item["category_code"])
        title = title or str(catalog_item["title"])
        unit = unit or str(catalog_item["unit"] or "С€С‚")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Door component quantity must be positive")

    return {
        "component_catalog_id": payload.component_catalog_id,
        "category_code": normalize_text(category_code) or "misc",
        "title": require_non_empty_text(title, detail="Door component title is required"),
        "unit": unit or "С€С‚",
        "quantity": float(payload.quantity),
        "purchase_price": float(purchase_price) if purchase_price is not None else None,
        "sale_price": float(sale_price) if sale_price is not None else None,
        "note": normalize_optional_text(payload.note),
    }
