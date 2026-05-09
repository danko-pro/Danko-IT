# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _family_overview
from supply_bot.admin_api.app_routes_materials_support import (
    build_material_family_values,
    require_material_family,
    require_material_variant,
    search_material_catalog,
    split_material_alias_values,
    validate_material_alias_payload,
    validate_material_sku_payload,
)
from supply_bot.admin_api.deps import get_storage


def register_material_routes(
    app: FastAPI,
    *,
    family_create_payload_model,
    variant_create_payload_model,
    sku_create_payload_model,
    alias_create_payload_model,
) -> None:
    # Route-модуль получает Pydantic-модели из app.py во время регистрации.
    # Для FastAPI это штатный сценарий, но pyright/mypy иначе ругаются на
    # dynamic type annotations во вложенных handlers.
    # Material catalog is a separate subsystem; routes stay isolated from calculator flows.
    @app.get("/api/materials/families")
    async def material_families(request: Request, limit: int = 100) -> list[dict[str, Any]]:
        storage_obj = get_storage(request)
        families = await storage_obj.list_families()
        trimmed = families[: max(1, min(limit, 100))]
        return [await _family_overview(storage_obj, family) for family in trimmed]

    @app.get("/api/materials/families/{family_id}")
    async def material_family_detail(request: Request, family_id: int) -> dict[str, Any]:
        storage_obj = get_storage(request)
        family = await storage_obj.get_family(family_id)
        if not family:
            raise HTTPException(status_code=404, detail="Family not found")
        aliases = await storage_obj.list_aliases(family_id=family_id)
        variants = await storage_obj.list_variants(family_id)
        skus = await storage_obj.list_skus(family_id=family_id)
        return {
            "family": await _family_overview(storage_obj, family),
            "aliases": aliases,
            "variants": variants,
            "skus": skus,
        }

    @app.post("/api/materials/families")
    async def create_material_family(
        request: Request,
        payload: family_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        family_id = await storage_obj.create_family(**build_material_family_values(payload))
        family = await storage_obj.get_family(family_id)
        if not family:
            raise HTTPException(status_code=500, detail="Family was not created")
        return await _family_overview(storage_obj, family)

    @app.post("/api/materials/variants")
    async def create_material_variant(
        request: Request,
        payload: variant_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        await require_material_family(storage_obj, payload.family_id)
        display_name = payload.display_name.strip()
        if not display_name:
            raise HTTPException(status_code=400, detail="display_name is required")
        variant_id = await storage_obj.create_variant(payload.family_id, display_name)
        return await require_material_variant(storage_obj, variant_id)

    @app.post("/api/materials/skus")
    async def create_material_sku(
        request: Request,
        payload: sku_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        sku_id = await storage_obj.create_sku(**await validate_material_sku_payload(storage_obj, payload))
        sku = await storage_obj.get_sku(sku_id)
        if not sku:
            raise HTTPException(status_code=500, detail="SKU was not created")
        return sku

    @app.post("/api/materials/aliases")
    async def create_material_alias(
        request: Request,
        payload: alias_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        alias = await validate_material_alias_payload(storage_obj, payload)

        await storage_obj.create_alias(
            alias,
            family_id=payload.family_id,
            variant_id=payload.variant_id,
            sku_id=payload.sku_id,
            priority=payload.priority,
        )

        return {
            "created_count": len(split_material_alias_values(alias)),
            "family_id": payload.family_id,
            "variant_id": payload.variant_id,
            "sku_id": payload.sku_id,
        }

    @app.get("/api/materials/search")
    async def search_materials(request: Request, q: str) -> list[dict[str, Any]]:
        storage_obj = get_storage(request)
        return await search_material_catalog(storage_obj, q)
