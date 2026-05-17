from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from supply_bot.admin_api.app_helpers import _family_overview
from supply_bot.admin_api.app_routes_materials_support import (
    build_material_family_values,
    require_material_family,
    require_material_variant,
    split_material_alias_values,
    validate_material_alias_payload,
    validate_material_sku_payload,
)
from supply_bot.admin_api.error_mapping import raise_application_http_error
from supply_bot.application.errors import ApplicationError
from supply_bot.materials.application.get_family_detail import (
    GetMaterialFamilyDetailCommand,
    GetMaterialFamilyDetailUseCase,
)
from supply_bot.materials.application.list_families import ListMaterialFamiliesUseCase
from supply_bot.materials.application.search_materials import SearchMaterialsUseCase


async def list_material_families(storage_obj, *, limit: int = 100) -> list[dict[str, Any]]:
    try:
        return await ListMaterialFamiliesUseCase(storage_obj).execute(limit=limit)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def get_material_family_detail(storage_obj, family_id: int) -> dict[str, Any]:
    try:
        command = GetMaterialFamilyDetailCommand(family_id=family_id)
        return await GetMaterialFamilyDetailUseCase(storage_obj).execute(command)
    except ApplicationError as exc:
        raise_application_http_error(exc)


async def create_material_family(storage_obj, payload) -> dict[str, Any]:
    family_id = await storage_obj.create_family(**build_material_family_values(payload))
    family = await storage_obj.get_family(family_id)
    if not family:
        raise HTTPException(status_code=500, detail="Family was not created")
    return await _family_overview(storage_obj, family)


async def create_material_variant(storage_obj, payload) -> dict[str, Any]:
    await require_material_family(storage_obj, payload.family_id)
    display_name = payload.display_name.strip()
    if not display_name:
        raise HTTPException(status_code=400, detail="display_name is required")
    variant_id = await storage_obj.create_variant(payload.family_id, display_name)
    return await require_material_variant(storage_obj, variant_id)


async def create_material_sku(storage_obj, payload) -> dict[str, Any]:
    sku_id = await storage_obj.create_sku(**await validate_material_sku_payload(storage_obj, payload))
    sku = await storage_obj.get_sku(sku_id)
    if not sku:
        raise HTTPException(status_code=500, detail="SKU was not created")
    return sku


async def create_material_alias(storage_obj, payload) -> dict[str, Any]:
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


async def search_materials(storage_obj, query: str) -> list[dict[str, Any]]:
    try:
        return await SearchMaterialsUseCase(storage_obj).execute(query)
    except ApplicationError as exc:
        raise_application_http_error(exc)
