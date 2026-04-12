# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _estimate_project_payload
from supply_bot.storage import BotStorage
from supply_bot.utils import normalize_text


def register_calculator_door_routes(
    app: FastAPI,
    *,
    calculator_door_catalog_payload_model,
    calculator_door_component_catalog_payload_model,
    calculator_project_door_payload_model,
    calculator_project_door_component_payload_model,
) -> None:
    # Дверной модуль отделён, потому что у него собственный каталог и проектные комплектующие.
    @app.get("/api/calculator/door-catalog")
    async def calculator_door_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        return await storage_obj.list_estimate_door_catalog()

    @app.post("/api/calculator/door-catalog")
    async def create_calculator_door_catalog_item(
        request: Request,
        payload: calculator_door_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Door title is required")
        if payload.width_mm <= 0 or payload.height_mm <= 0:
            raise HTTPException(status_code=400, detail="Door width and height must be positive")
        door_id = await storage_obj.create_estimate_door_catalog_item(
            title=title,
            width_mm=payload.width_mm,
            height_mm=payload.height_mm,
            thickness_mm=payload.thickness_mm,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            install_price=payload.install_price,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        catalog = await storage_obj.list_estimate_door_catalog()
        created = next((item for item in catalog if int(item["id"]) == door_id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Door catalog item was not created")
        return created

    @app.get("/api/calculator/door-component-catalog")
    async def calculator_door_component_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj: BotStorage = request.app.state.storage
        return await storage_obj.list_estimate_door_component_catalog()

    @app.post("/api/calculator/door-component-catalog")
    async def create_calculator_door_component_catalog_item(
        request: Request,
        payload: calculator_door_component_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        category_code = normalize_text(payload.category_code) or "misc"
        title = payload.title.strip()
        unit = payload.unit.strip() or "шт"
        if not title:
            raise HTTPException(status_code=400, detail="Door component title is required")
        component_id = await storage_obj.create_estimate_door_component_catalog_item(
            category_code=category_code,
            title=title,
            unit=unit,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        catalog = await storage_obj.list_estimate_door_component_catalog()
        created = next((item for item in catalog if int(item["id"]) == component_id), None)
        if not created:
            raise HTTPException(status_code=500, detail="Door component catalog item was not created")
        return created

    @app.post("/api/calculator/projects/{project_id}/doors")
    async def create_calculator_project_door(
        request: Request,
        project_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Calculator project not found")

        catalog_item = None
        if payload.door_catalog_id is not None:
            catalog = await storage_obj.list_estimate_door_catalog()
            catalog_item = next((item for item in catalog if int(item["id"]) == payload.door_catalog_id), None)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Door catalog item not found")

        title = payload.title.strip() if payload.title and payload.title.strip() else None
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

        if not title:
            raise HTTPException(status_code=400, detail="Door title is required")
        if width_mm is None or height_mm is None or width_mm <= 0 or height_mm <= 0:
            raise HTTPException(status_code=400, detail="Door width and height must be positive")
        if payload.room_a_id is None and payload.room_b_id is None:
            raise HTTPException(status_code=400, detail="At least one room must be selected")

        await storage_obj.create_estimate_project_door(
            project_id=project_id,
            door_catalog_id=payload.door_catalog_id,
            title=title,
            opening_kind=payload.opening_kind.strip() or "door",
            width_mm=float(width_mm),
            height_mm=float(height_mm),
            thickness_mm=float(thickness_mm) if thickness_mm is not None else None,
            purchase_price=float(purchase_price) if purchase_price is not None else None,
            sale_price=float(sale_price) if sale_price is not None else None,
            install_price=float(install_price) if install_price is not None else None,
            room_a_id=payload.room_a_id,
            room_b_id=payload.room_b_id,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        fresh_project = await storage_obj.get_estimate_project(project_id)
        if not fresh_project:
            raise HTTPException(status_code=500, detail="Project not found after door creation")
        return await _estimate_project_payload(storage_obj, fresh_project)

    @app.patch("/api/calculator/project-doors/{door_id}")
    async def update_calculator_project_door(
        request: Request,
        door_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage

        catalog_item = None
        if payload.door_catalog_id is not None:
            catalog = await storage_obj.list_estimate_door_catalog()
            catalog_item = next((item for item in catalog if int(item["id"]) == payload.door_catalog_id), None)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Door catalog item not found")

        title = payload.title.strip() if payload.title and payload.title.strip() else None
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

        if not title:
            raise HTTPException(status_code=400, detail="Door title is required")
        if width_mm is None or height_mm is None or width_mm <= 0 or height_mm <= 0:
            raise HTTPException(status_code=400, detail="Door width and height must be positive")
        if payload.room_a_id is None and payload.room_b_id is None:
            raise HTTPException(status_code=400, detail="At least one room must be selected")

        project_id = await storage_obj.update_estimate_project_door(
            door_id,
            door_catalog_id=payload.door_catalog_id,
            title=title,
            opening_kind=payload.opening_kind.strip() or "door",
            width_mm=float(width_mm),
            height_mm=float(height_mm),
            thickness_mm=float(thickness_mm) if thickness_mm is not None else None,
            purchase_price=float(purchase_price) if purchase_price is not None else None,
            sale_price=float(sale_price) if sale_price is not None else None,
            install_price=float(install_price) if install_price is not None else None,
            room_a_id=payload.room_a_id,
            room_b_id=payload.room_b_id,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        if project_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        fresh_project = await storage_obj.get_estimate_project(project_id)
        if not fresh_project:
            raise HTTPException(status_code=500, detail="Project not found after door update")
        return await _estimate_project_payload(storage_obj, fresh_project)

    @app.delete("/api/calculator/project-doors/{door_id}")
    async def delete_calculator_project_door(request: Request, door_id: int) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project_id = await storage_obj.delete_estimate_project_door(door_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project not found after door deletion")
        return await _estimate_project_payload(storage_obj, project)

    @app.post("/api/calculator/project-doors/{door_id}/components")
    async def create_calculator_project_door_component(
        request: Request,
        door_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        catalog_item = None
        if payload.component_catalog_id is not None:
            catalog = await storage_obj.list_estimate_door_component_catalog()
            catalog_item = next((item for item in catalog if int(item["id"]) == payload.component_catalog_id), None)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Door component catalog item not found")

        category_code = normalize_text(
            payload.category_code or str(catalog_item["category_code"]) if catalog_item else ""
        )
        title = payload.title.strip() if payload.title and payload.title.strip() else None
        unit = payload.unit.strip() if payload.unit and payload.unit.strip() else None
        purchase_price = payload.purchase_price
        sale_price = payload.sale_price

        if catalog_item is not None:
            category_code = category_code or str(catalog_item["category_code"])
            title = title or str(catalog_item["title"])
            unit = unit or str(catalog_item["unit"] or "шт")

        if not title:
            raise HTTPException(status_code=400, detail="Door component title is required")
        if not category_code:
            category_code = "misc"
        if payload.quantity <= 0:
            raise HTTPException(status_code=400, detail="Door component quantity must be positive")

        component_id = await storage_obj.create_estimate_project_door_component(
            project_door_id=door_id,
            component_catalog_id=payload.component_catalog_id,
            category_code=category_code,
            title=title,
            unit=unit or "шт",
            quantity=float(payload.quantity),
            purchase_price=float(purchase_price) if purchase_price is not None else None,
            sale_price=float(sale_price) if sale_price is not None else None,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        if component_id is None:
            raise HTTPException(status_code=404, detail="Project door not found")
        async with storage_obj.connection() as db:
            cursor = await db.execute("SELECT project_id FROM estimate_project_doors WHERE id = ?", (door_id,))
            row = await cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=500, detail="Project not found after component creation")
        project = await storage_obj.get_estimate_project(int(row["project_id"]))
        if not project:
            raise HTTPException(status_code=500, detail="Project not found after component creation")
        return await _estimate_project_payload(storage_obj, project)

    @app.patch("/api/calculator/door-components/{component_id}")
    async def update_calculator_project_door_component(
        request: Request,
        component_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        catalog_item = None
        if payload.component_catalog_id is not None:
            catalog = await storage_obj.list_estimate_door_component_catalog()
            catalog_item = next((item for item in catalog if int(item["id"]) == payload.component_catalog_id), None)
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Door component catalog item not found")

        category_code = normalize_text(
            payload.category_code or str(catalog_item["category_code"]) if catalog_item else ""
        )
        title = payload.title.strip() if payload.title and payload.title.strip() else None
        unit = payload.unit.strip() if payload.unit and payload.unit.strip() else None
        purchase_price = payload.purchase_price
        sale_price = payload.sale_price

        if catalog_item is not None:
            category_code = category_code or str(catalog_item["category_code"])
            title = title or str(catalog_item["title"])
            unit = unit or str(catalog_item["unit"] or "шт")

        if not title:
            raise HTTPException(status_code=400, detail="Door component title is required")
        if not category_code:
            category_code = "misc"
        if payload.quantity <= 0:
            raise HTTPException(status_code=400, detail="Door component quantity must be positive")

        project_id = await storage_obj.update_estimate_project_door_component(
            component_id,
            component_catalog_id=payload.component_catalog_id,
            category_code=category_code,
            title=title,
            unit=unit or "шт",
            quantity=float(payload.quantity),
            purchase_price=float(purchase_price) if purchase_price is not None else None,
            sale_price=float(sale_price) if sale_price is not None else None,
            note=payload.note.strip() if payload.note and payload.note.strip() else None,
        )
        if project_id is None:
            raise HTTPException(status_code=404, detail="Door component not found")
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project not found after component update")
        return await _estimate_project_payload(storage_obj, project)

    @app.delete("/api/calculator/door-components/{component_id}")
    async def delete_calculator_project_door_component(request: Request, component_id: int) -> dict[str, Any]:
        storage_obj: BotStorage = request.app.state.storage
        project_id = await storage_obj.delete_estimate_project_door_component(component_id)
        if project_id is None:
            raise HTTPException(status_code=404, detail="Door component not found")
        project = await storage_obj.get_estimate_project(project_id)
        if not project:
            raise HTTPException(status_code=500, detail="Project not found after component deletion")
        return await _estimate_project_payload(storage_obj, project)
