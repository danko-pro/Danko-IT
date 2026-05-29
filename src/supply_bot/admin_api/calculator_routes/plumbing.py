from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Query, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_created_catalog_item,
)
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.schemas.calculator_plumbing import (
    PlumbingCatalogItemCreatePayload,
    PlumbingCatalogItemUpdatePayload,
    PlumbingZoneCreatePayload,
    PlumbingZoneItemsReplacePayload,
    PlumbingZonePackagesReplacePayload,
    PlumbingZoneUpdatePayload,
)
from supply_bot.estimates.application.plumbing_catalog import (
    CreatePlumbingCatalogItemCommand,
    CreatePlumbingCatalogItemUseCase,
    CreatePlumbingZoneCommand,
    CreatePlumbingZoneUseCase,
    DeletePlumbingCatalogItemUseCase,
    DeletePlumbingZoneUseCase,
    GetPlumbingCatalogItemUseCase,
    GetPlumbingZoneUseCase,
    ListPlumbingCatalogItemsUseCase,
    ListPlumbingZonesUseCase,
    ReplacePlumbingZoneItemsCommand,
    ReplacePlumbingZoneItemsUseCase,
    ReplacePlumbingZonePackagesCommand,
    ReplacePlumbingZonePackagesUseCase,
    UpdatePlumbingCatalogItemCommand,
    UpdatePlumbingCatalogItemUseCase,
    UpdatePlumbingZoneCommand,
    UpdatePlumbingZoneUseCase,
)
from supply_bot.estimates.application.plumbing_snapshot import BuildPlumbingSnapshotUseCase


def register_calculator_plumbing_routes(app: FastAPI) -> None:
    # --- Атомарные позиции каталога ---

    @app.get("/api/calculator/plumbing/catalog-items")
    async def list_calculator_plumbing_catalog_items(
        request: Request,
        include_inactive: bool = Query(False),
    ) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListPlumbingCatalogItemsUseCase(storage_obj).execute(include_inactive=include_inactive)

    @app.get("/api/calculator/plumbing/catalog-items/{item_id}")
    async def get_calculator_plumbing_catalog_item(request: Request, item_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        return await resolve_application_result(GetPlumbingCatalogItemUseCase(storage_obj).execute(item_id))

    @app.post("/api/calculator/plumbing/catalog-items")
    async def create_calculator_plumbing_catalog_item(
        request: Request,
        payload: PlumbingCatalogItemCreatePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreatePlumbingCatalogItemCommand(
            source_code=payload.source_code,
            public_title=payload.public_title,
            category=payload.category,
            unit=payload.unit,
            technical_title=payload.technical_title,
            work_price=payload.work_price,
            material_price=payload.material_price,
            equipment_price=payload.equipment_price,
            consumables_price=payload.consumables_price,
            coefficient=payload.coefficient,
            catalog_group=payload.catalog_group,
            source=payload.source,
            note=payload.note,
            is_active=payload.is_active,
            sort_order=payload.sort_order,
        )
        item_id = await resolve_application_result(CreatePlumbingCatalogItemUseCase(storage_obj).execute(command))
        return await load_created_catalog_item(
            storage_obj.list_plumbing_catalog_items,
            created_id=item_id,
            detail="Plumbing catalog item was not created",
        )

    @app.patch("/api/calculator/plumbing/catalog-items/{item_id}")
    async def update_calculator_plumbing_catalog_item(
        request: Request,
        item_id: int,
        payload: PlumbingCatalogItemUpdatePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = UpdatePlumbingCatalogItemCommand(
            item_id=item_id,
            payload=payload.model_dump(exclude_unset=True),
        )
        return await resolve_application_result(UpdatePlumbingCatalogItemUseCase(storage_obj).execute(command))

    @app.delete("/api/calculator/plumbing/catalog-items/{item_id}")
    async def delete_calculator_plumbing_catalog_item(request: Request, item_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await resolve_application_result(DeletePlumbingCatalogItemUseCase(storage_obj).execute(item_id))
        return {"id": item_id, "deleted": True}

    # --- Зоны ---

    @app.get("/api/calculator/plumbing/zones")
    async def list_calculator_plumbing_zones(
        request: Request,
        include_inactive: bool = Query(False),
    ) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListPlumbingZonesUseCase(storage_obj).execute(include_inactive=include_inactive)

    @app.get("/api/calculator/plumbing/zones/{zone_id}")
    async def get_calculator_plumbing_zone(request: Request, zone_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        return await _load_plumbing_zone_detail(storage_obj, zone_id)

    @app.post("/api/calculator/plumbing/zones")
    async def create_calculator_plumbing_zone(
        request: Request,
        payload: PlumbingZoneCreatePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreatePlumbingZoneCommand(
            zone_code=payload.zone_code,
            subgroup=payload.subgroup,
            title=payload.title,
            description=payload.description,
            disclaimer=payload.disclaimer,
            risk_percent=payload.risk_percent,
            active_package_code=payload.active_package_code,
            is_active=payload.is_active,
            sort_order=payload.sort_order,
        )
        zone_id = await resolve_application_result(CreatePlumbingZoneUseCase(storage_obj).execute(command))
        return await _load_plumbing_zone_detail(storage_obj, zone_id)

    @app.patch("/api/calculator/plumbing/zones/{zone_id}")
    async def update_calculator_plumbing_zone(
        request: Request,
        zone_id: int,
        payload: PlumbingZoneUpdatePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = UpdatePlumbingZoneCommand(zone_id=zone_id, payload=payload.model_dump(exclude_unset=True))
        await resolve_application_result(UpdatePlumbingZoneUseCase(storage_obj).execute(command))
        return await _load_plumbing_zone_detail(storage_obj, zone_id)

    @app.delete("/api/calculator/plumbing/zones/{zone_id}")
    async def delete_calculator_plumbing_zone(request: Request, zone_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        await resolve_application_result(DeletePlumbingZoneUseCase(storage_obj).execute(zone_id))
        return {"id": zone_id, "deleted": True}

    @app.put("/api/calculator/plumbing/zones/{zone_id}/items")
    async def replace_calculator_plumbing_zone_items(
        request: Request,
        zone_id: int,
        payload: PlumbingZoneItemsReplacePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = ReplacePlumbingZoneItemsCommand(
            zone_id=zone_id,
            items=[item.model_dump() for item in payload.items],
        )
        await resolve_application_result(ReplacePlumbingZoneItemsUseCase(storage_obj).execute(command))
        return await _load_plumbing_zone_detail(storage_obj, zone_id)

    @app.put("/api/calculator/plumbing/zones/{zone_id}/packages")
    async def replace_calculator_plumbing_zone_packages(
        request: Request,
        zone_id: int,
        payload: PlumbingZonePackagesReplacePayload,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = ReplacePlumbingZonePackagesCommand(
            zone_id=zone_id,
            packages=[package.model_dump() for package in payload.packages],
        )
        await resolve_application_result(ReplacePlumbingZonePackagesUseCase(storage_obj).execute(command))
        return await _load_plumbing_zone_detail(storage_obj, zone_id)

    # --- Снапшот (internal preview для админки) ---

    @app.get("/api/calculator/plumbing/snapshot/preview")
    async def calculator_plumbing_snapshot_preview(request: Request) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        return await BuildPlumbingSnapshotUseCase(storage_obj).build_internal()


async def _load_plumbing_zone_detail(storage_obj, zone_id: int) -> dict[str, Any]:
    zone = await resolve_application_result(GetPlumbingZoneUseCase(storage_obj).execute(zone_id))
    base = await storage_obj.list_plumbing_zone_items(zone_id)
    packages = await storage_obj.list_plumbing_zone_packages(zone_id)
    return {**zone, "base": base, "packages": packages}
