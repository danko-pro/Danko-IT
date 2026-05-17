# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.deps import get_catalog_storage
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.materials.application.create_alias import (
    CreateMaterialAliasCommand,
    CreateMaterialAliasUseCase,
)
from supply_bot.materials.application.create_family import (
    CreateMaterialFamilyCommand,
    CreateMaterialFamilyUseCase,
)
from supply_bot.materials.application.create_sku import (
    CreateMaterialSkuCommand,
    CreateMaterialSkuUseCase,
)
from supply_bot.materials.application.create_variant import (
    CreateMaterialVariantCommand,
    CreateMaterialVariantUseCase,
)
from supply_bot.materials.application.get_family_detail import (
    GetMaterialFamilyDetailCommand,
    GetMaterialFamilyDetailUseCase,
)
from supply_bot.materials.application.list_families import ListMaterialFamiliesUseCase
from supply_bot.materials.application.search_materials import (
    SearchMaterialsUseCase,
)


def register_material_routes(
    app: FastAPI,
    *,
    family_create_payload_model,
    variant_create_payload_model,
    sku_create_payload_model,
    alias_create_payload_model,
) -> None:
    # Роуты принимают Pydantic-модели во время сборки приложения.
    # Каталог вынесен в отдельный repository, HTTP-слой только прокидывает команды в use-case.
    @app.get("/api/materials/families")
    async def material_families(request: Request, limit: int = 100) -> list[dict[str, Any]]:
        storage_obj = get_catalog_storage(request)
        return await resolve_application_result(
            ListMaterialFamiliesUseCase(storage_obj).execute(limit=limit)
        )

    @app.get("/api/materials/families/{family_id}")
    async def material_family_detail(request: Request, family_id: int) -> dict[str, Any]:
        storage_obj = get_catalog_storage(request)
        command = GetMaterialFamilyDetailCommand(family_id=family_id)
        return await resolve_application_result(
            GetMaterialFamilyDetailUseCase(storage_obj).execute(command)
        )

    @app.post("/api/materials/families")
    async def create_material_family(
        request: Request,
        payload: family_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_catalog_storage(request)
        command = CreateMaterialFamilyCommand(
            canonical_name=payload.canonical_name,
            default_unit=payload.default_unit,
            dialog_fields=list(payload.dialog_fields),
            category=payload.category,
        )
        return await resolve_application_result(
            CreateMaterialFamilyUseCase(storage_obj).execute(command)
        )

    @app.post("/api/materials/variants")
    async def create_material_variant(
        request: Request,
        payload: variant_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_catalog_storage(request)
        command = CreateMaterialVariantCommand(
            family_id=payload.family_id,
            display_name=payload.display_name,
        )
        return await resolve_application_result(
            CreateMaterialVariantUseCase(storage_obj).execute(command)
        )

    @app.post("/api/materials/skus")
    async def create_material_sku(
        request: Request,
        payload: sku_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_catalog_storage(request)
        command = CreateMaterialSkuCommand(
            family_id=payload.family_id,
            variant_id=payload.variant_id,
            title=payload.title,
            article=payload.article,
            brand=payload.brand,
            unit=payload.unit,
            thickness_mm=payload.thickness_mm,
            length_mm=payload.length_mm,
            width_mm=payload.width_mm,
            source_description=payload.source_description,
        )
        return await resolve_application_result(
            CreateMaterialSkuUseCase(storage_obj).execute(command)
        )

    @app.post("/api/materials/aliases")
    async def create_material_alias(
        request: Request,
        payload: alias_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_catalog_storage(request)
        command = CreateMaterialAliasCommand(
            alias=payload.alias,
            family_id=payload.family_id,
            variant_id=payload.variant_id,
            sku_id=payload.sku_id,
            priority=payload.priority,
        )
        return await resolve_application_result(
            CreateMaterialAliasUseCase(storage_obj).execute(command)
        )

    @app.get("/api/materials/search")
    async def search_materials(request: Request, q: str) -> list[dict[str, Any]]:
        storage_obj = get_catalog_storage(request)
        return await resolve_application_result(SearchMaterialsUseCase(storage_obj).execute(q))
