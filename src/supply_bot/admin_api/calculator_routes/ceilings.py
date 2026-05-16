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
from supply_bot.estimates.application.ceiling_catalog import (
    CreateCeilingCatalogItemCommand,
    CreateCeilingCatalogItemUseCase,
    UpdateCeilingCatalogItemCommand,
    UpdateCeilingCatalogItemUseCase,
)
from supply_bot.estimates.application.ceiling_project_items import (
    CeilingProjectItemValuesCommand,
    CreateCeilingProjectItemCommand,
    CreateCeilingProjectItemUseCase,
    DeleteCeilingProjectItemCommand,
    DeleteCeilingProjectItemUseCase,
    UpdateCeilingProjectItemCommand,
    UpdateCeilingProjectItemUseCase,
)
from supply_bot.estimates.application.replace_ceiling_rooms import (
    ReplaceCeilingRoomCommand,
    ReplaceCeilingRoomsCommand,
    ReplaceCeilingRoomsUseCase,
)
from supply_bot.estimates.application.update_ceiling_config import (
    UpdateCeilingConfigCommand,
    UpdateCeilingConfigUseCase,
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
        command = UpdateCeilingConfigCommand(
            project_id=project_id,
            default_package_code=payload.get("default_package_code"),
            price_factor=payload.get("price_factor"),
            note=payload.get("note"),
        )
        try:
            await UpdateCeilingConfigUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator project not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.post("/api/calculator/ceilings/catalog-items")
    async def create_calculator_ceiling_catalog_item(
        request: Request,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateCeilingCatalogItemCommand(
            source_code=payload.get("source_code"),
            title=payload.get("title"),
            category=payload.get("category"),
            unit=payload.get("unit"),
            work_price=payload.get("work_price"),
            material_price=payload.get("material_price"),
            equipment_price=payload.get("equipment_price"),
            consumables_price=payload.get("consumables_price"),
            price_factor=payload.get("price_factor"),
            quantity_source=payload.get("quantity_source"),
            quantity_formula=payload.get("quantity_formula"),
            include_section=payload.get("include_section"),
            package_code=payload.get("package_code"),
            note=payload.get("note"),
            is_active=payload.get("is_active", True),
            sort_order=payload.get("sort_order"),
        )
        try:
            item_id = await CreateCeilingCatalogItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
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
        command = UpdateCeilingCatalogItemCommand(item_id=item_id, payload=payload)
        try:
            return await UpdateCeilingCatalogItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Ceiling catalog item not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc

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
        command = ReplaceCeilingRoomsCommand(
            project_id=project_id,
            rooms=[
                ReplaceCeilingRoomCommand(
                    room_id=int(room_payload["room_id"]),
                    default_catalog_item_id=room_payload.get("default_catalog_item_id"),
                    is_enabled=room_payload.get("is_enabled", True),
                    ceiling_area_m2=room_payload.get("ceiling_area_m2"),
                    area_source=room_payload.get("area_source"),
                    perimeter_m=room_payload.get("perimeter_m"),
                    perimeter_source=room_payload.get("perimeter_source"),
                    package_code_snapshot=room_payload.get("package_code_snapshot"),
                    note=room_payload.get("note"),
                    sort_order=room_payload.get("sort_order"),
                )
                for room_payload in payload.get("rooms") or []
            ],
        )
        try:
            await ReplaceCeilingRoomsUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator project not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.post("/api/calculator/projects/{project_id}/ceilings/items")
    async def create_calculator_project_ceiling_item(
        request: Request,
        project_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateCeilingProjectItemCommand(
            project_id=project_id,
            item=_ceiling_project_item_values_command(payload),
        )
        try:
            await CreateCeilingProjectItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) == "Calculator project not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
        return await _load_ceiling_payload_by_project_id(storage_obj, project_id)

    @app.patch("/api/calculator/ceilings/items/{item_id}")
    async def update_calculator_project_ceiling_item(
        request: Request,
        item_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = payload.get("project_id")
        command = UpdateCeilingProjectItemCommand(
            item_id=item_id,
            project_id=int(project_id) if project_id is not None else None,
            item=_ceiling_project_item_values_command(payload),
        )
        try:
            updated_project_id = await UpdateCeilingProjectItemUseCase(storage_obj).execute(command)
        except ValueError as exc:
            status_code = 404 if str(exc) in {"Calculator project not found", "Ceiling project item not found"} else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
        return await _load_ceiling_payload_by_project_id(storage_obj, updated_project_id)

    @app.delete("/api/calculator/ceilings/items/{item_id}")
    async def delete_calculator_project_ceiling_item(request: Request, item_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        try:
            project_id = await DeleteCeilingProjectItemUseCase(storage_obj).execute(
                DeleteCeilingProjectItemCommand(item_id=item_id)
            )
        except ValueError as exc:
            status_code = 404 if str(exc) == "Ceiling project item not found" else 400
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
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


def _ceiling_project_item_values_command(payload: dict[str, Any]) -> CeilingProjectItemValuesCommand:
    return CeilingProjectItemValuesCommand(
        room_id=payload.get("room_id"),
        source_catalog_item_id=payload.get("source_catalog_item_id"),
        source_code_snapshot=payload.get("source_code_snapshot"),
        title_snapshot=payload.get("title_snapshot"),
        category_snapshot=payload.get("category_snapshot"),
        unit_snapshot=payload.get("unit_snapshot"),
        quantity=payload.get("quantity"),
        quantity_source=payload.get("quantity_source"),
        quantity_formula_snapshot=payload.get("quantity_formula_snapshot"),
        work_price_snapshot=payload.get("work_price_snapshot"),
        material_price_snapshot=payload.get("material_price_snapshot"),
        equipment_price_snapshot=payload.get("equipment_price_snapshot"),
        consumables_price_snapshot=payload.get("consumables_price_snapshot"),
        price_factor_snapshot=payload.get("price_factor_snapshot"),
        work_total=payload.get("work_total"),
        material_total=payload.get("material_total"),
        equipment_total=payload.get("equipment_total"),
        consumables_total=payload.get("consumables_total"),
        total=payload.get("total"),
        note_snapshot=payload.get("note_snapshot"),
        is_enabled=payload.get("is_enabled", True),
        sort_order=payload.get("sort_order"),
    )
