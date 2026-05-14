from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_payloads.ceilings import _estimate_ceilings_payload
from supply_bot.admin_api.calculator_routes.shared import (
    clamp_non_negative,
    get_calculator_route_storage,
    load_created_catalog_item,
    normalize_optional_text,
    require_estimate_project,
    require_non_empty_text,
)


def register_calculator_ceiling_routes(app: FastAPI) -> None:
    @app.get("/api/calculator/projects/{project_id}/ceilings")
    async def calculator_project_ceilings(request: Request, project_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project = await require_estimate_project(storage_obj, project_id)
        return await _load_ceiling_payload(storage_obj, project)

    @app.patch("/api/calculator/projects/{project_id}/ceilings/config")
    async def update_calculator_ceiling_config(
        request: Request,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        await storage_obj.update_estimate_ceiling_config(
            project_id,
            default_package_code=normalize_optional_text(payload.get("default_package_code")),
            price_factor=_clamp_factor(payload.get("price_factor")),
            note=normalize_optional_text(payload.get("note")),
        )
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.post("/api/calculator/ceilings/catalog-items")
    async def create_calculator_ceiling_catalog_item(
        request: Request,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        item_id = await storage_obj.create_estimate_ceiling_catalog_item(
            source_code=require_non_empty_text(payload.get("source_code"), detail="Ceiling source code is required"),
            title=require_non_empty_text(payload.get("title"), detail="Ceiling title is required"),
            category=require_non_empty_text(payload.get("category"), detail="Ceiling category is required"),
            unit=require_non_empty_text(payload.get("unit"), detail="Ceiling unit is required"),
            work_price=clamp_non_negative(payload.get("work_price")),
            material_price=clamp_non_negative(payload.get("material_price")),
            equipment_price=clamp_non_negative(payload.get("equipment_price")),
            consumables_price=clamp_non_negative(payload.get("consumables_price")),
            price_factor=_clamp_factor(payload.get("price_factor")),
            quantity_source=normalize_optional_text(payload.get("quantity_source")),
            quantity_formula=normalize_optional_text(payload.get("quantity_formula")),
            include_section=normalize_optional_text(payload.get("include_section")) or "ceilings",
            package_code=normalize_optional_text(payload.get("package_code")),
            note=normalize_optional_text(payload.get("note")),
            is_active=bool(payload.get("is_active", True)),
            sort_order=max(0, int(payload.get("sort_order") or 100)),
        )
        return await load_created_catalog_item(
            storage_obj.list_estimate_ceiling_catalog_items,
            created_id=item_id,
            detail="Ceiling catalog item was not created",
        )

    @app.patch("/api/calculator/ceilings/catalog-items/{item_id}")
    async def update_calculator_ceiling_catalog_item(
        request: Request,
        item_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        updates = _catalog_updates(payload)
        updated = await storage_obj.update_estimate_ceiling_catalog_item(item_id, **updates)
        if not updated:
            raise HTTPException(status_code=404, detail="Ceiling catalog item not found")
        item = await storage_obj.get_estimate_ceiling_catalog_item(item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Ceiling catalog item not found")
        return item

    @put_or_post(app, "/api/calculator/projects/{project_id}/ceilings/config")
    async def put_calculator_ceiling_config(
        request: Request,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        return await update_calculator_ceiling_config(request, project_id, payload)

    @app.put("/api/calculator/projects/{project_id}/ceilings/rooms")
    async def replace_calculator_ceiling_rooms(
        request: Request,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        room_ids = {int(room["id"]) for room in await storage_obj.list_estimate_rooms(project_id)}
        catalog_ids = {int(item["id"]) for item in await storage_obj.list_estimate_ceiling_catalog_items()}
        rows = []
        for index, room_payload in enumerate(payload.get("rooms") or [], start=1):
            room_id = int(room_payload["room_id"])
            if room_id not in room_ids:
                raise HTTPException(status_code=400, detail="Unknown ceiling room selected")
            catalog_item_id = room_payload.get("default_catalog_item_id")
            if catalog_item_id is not None and int(catalog_item_id) not in catalog_ids:
                raise HTTPException(status_code=400, detail="Unknown ceiling catalog item selected")
            rows.append(
                {
                    "room_id": room_id,
                    "default_catalog_item_id": catalog_item_id,
                    "is_enabled": bool(room_payload.get("is_enabled", True)),
                    "ceiling_area_m2": _optional_non_negative(room_payload.get("ceiling_area_m2")),
                    "area_source": normalize_optional_text(room_payload.get("area_source")) or "room_area",
                    "perimeter_m": _optional_non_negative(room_payload.get("perimeter_m")),
                    "perimeter_source": normalize_optional_text(room_payload.get("perimeter_source"))
                    or "room_perimeter",
                    "package_code_snapshot": normalize_optional_text(room_payload.get("package_code_snapshot")),
                    "note": normalize_optional_text(room_payload.get("note")),
                    "sort_order": int(room_payload.get("sort_order") or index * 10),
                }
            )
        await storage_obj.replace_estimate_ceiling_rooms(project_id, rows)
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.post("/api/calculator/projects/{project_id}/ceilings/items")
    async def create_calculator_project_ceiling_item(
        request: Request,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await require_estimate_project(storage_obj, project_id)
        await _validate_project_item_refs(storage_obj, project_id, payload)
        item_id = await storage_obj.create_estimate_project_ceiling_item(
            project_id=project_id,
            **_project_item_values(payload),
        )
        if not item_id:
            raise HTTPException(status_code=404, detail="Calculator project not found")
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.patch("/api/calculator/ceilings/items/{item_id}")
    async def update_calculator_project_ceiling_item(
        request: Request,
        item_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = payload.get("project_id")
        if project_id is None:
            raise HTTPException(status_code=400, detail="Ceiling project_id is required")
        project_id = int(project_id)
        await require_estimate_project(storage_obj, project_id)
        await _validate_project_item_refs(storage_obj, project_id, payload)
        updated_project_id = await storage_obj.update_estimate_project_ceiling_item(
            item_id,
            **_project_item_values(payload),
        )
        if updated_project_id is None:
            raise HTTPException(status_code=404, detail="Ceiling project item not found")
        return await _load_ceiling_payload_by_project_id(storage_obj, updated_project_id)

    @app.delete("/api/calculator/ceilings/items/{item_id}")
    async def delete_calculator_project_ceiling_item(request: Request, item_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await storage_obj.delete_estimate_project_ceiling_item(item_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Ceiling project item not found")
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)


def put_or_post(app: FastAPI, path: str):
    def decorator(func):
        app.put(path)(func)
        app.post(path)(func)
        return func

    return decorator


async def _load_ceiling_payload_by_project_id(storage_obj, project_id: int) -> dict[str, Any]:
    project = await require_estimate_project(storage_obj, project_id)
    return await _load_ceiling_payload(storage_obj, project)


async def _load_ceiling_payload(storage_obj, project: dict[str, Any]) -> dict[str, Any]:
    project_payload = await storage_obj.get_estimate_project(int(project["id"]))
    if not project_payload:
        raise HTTPException(status_code=404, detail="Calculator project not found")
    rooms = await storage_obj.list_estimate_rooms(int(project["id"]))
    room_payloads = [
        {
            "id": int(room["id"]),
            "name": room["name"],
            "floor_area_m2": room.get("manual_floor_area_m2") or 0,
            "perimeter_m": 0,
            "sort_order": room.get("sort_order"),
        }
        for room in rooms
    ]
    return await _estimate_ceilings_payload(storage_obj, project_payload, room_payloads)


def _catalog_updates(payload: dict[str, Any]) -> dict[str, Any]:
    updates: dict[str, Any] = {}
    text_fields = {
        "source_code",
        "title",
        "category",
        "unit",
        "quantity_source",
        "quantity_formula",
        "include_section",
        "package_code",
        "note",
    }
    price_fields = {
        "work_price",
        "material_price",
        "equipment_price",
        "consumables_price",
        "price_factor",
    }
    for field in text_fields:
        if field in payload:
            updates[field] = normalize_optional_text(payload.get(field))
    for field in price_fields:
        if field in payload:
            updates[field] = _clamp_factor(payload.get(field)) if field == "price_factor" else clamp_non_negative(
                payload.get(field)
            )
    if "is_active" in payload:
        updates["is_active"] = bool(payload.get("is_active"))
    if "sort_order" in payload:
        updates["sort_order"] = max(0, int(payload.get("sort_order") or 0))
    return updates


async def _validate_project_item_refs(storage_obj, project_id: int, payload: dict[str, Any]) -> None:
    room_id = payload.get("room_id")
    if room_id is not None:
        room_ids = {int(room["id"]) for room in await storage_obj.list_estimate_rooms(project_id)}
        if int(room_id) not in room_ids:
            raise HTTPException(status_code=400, detail="Unknown ceiling room selected")
    catalog_item_id = payload.get("source_catalog_item_id")
    if catalog_item_id is not None:
        item = await storage_obj.get_estimate_ceiling_catalog_item(int(catalog_item_id))
        if not item:
            raise HTTPException(status_code=400, detail="Unknown ceiling catalog item selected")


def _project_item_values(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "room_id": payload.get("room_id"),
        "source_catalog_item_id": payload.get("source_catalog_item_id"),
        "source_code_snapshot": normalize_optional_text(payload.get("source_code_snapshot")),
        "title_snapshot": require_non_empty_text(payload.get("title_snapshot"), detail="Ceiling title is required"),
        "category_snapshot": normalize_optional_text(payload.get("category_snapshot")),
        "unit_snapshot": require_non_empty_text(payload.get("unit_snapshot"), detail="Ceiling unit is required"),
        "quantity": clamp_non_negative(payload.get("quantity")),
        "quantity_source": normalize_optional_text(payload.get("quantity_source")) or "manual",
        "quantity_formula_snapshot": normalize_optional_text(payload.get("quantity_formula_snapshot")),
        "work_price_snapshot": clamp_non_negative(payload.get("work_price_snapshot")),
        "material_price_snapshot": clamp_non_negative(payload.get("material_price_snapshot")),
        "equipment_price_snapshot": clamp_non_negative(payload.get("equipment_price_snapshot")),
        "consumables_price_snapshot": clamp_non_negative(payload.get("consumables_price_snapshot")),
        "price_factor_snapshot": _clamp_factor(payload.get("price_factor_snapshot")),
        "work_total": clamp_non_negative(payload.get("work_total")),
        "material_total": clamp_non_negative(payload.get("material_total")),
        "equipment_total": clamp_non_negative(payload.get("equipment_total")),
        "consumables_total": clamp_non_negative(payload.get("consumables_total")),
        "total": clamp_non_negative(payload.get("total")),
        "note_snapshot": normalize_optional_text(payload.get("note_snapshot")),
        "is_enabled": bool(payload.get("is_enabled", True)),
        "sort_order": max(0, int(payload.get("sort_order") or 100)),
    }


def _optional_non_negative(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return clamp_non_negative(value)


def _clamp_factor(value: Any) -> float:
    if value in (None, ""):
        return 1.0
    return clamp_non_negative(value)
