# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.use_cases.materials import (
    create_material_alias as create_material_alias_use_case,
    create_material_family as create_material_family_use_case,
    create_material_sku as create_material_sku_use_case,
    create_material_variant as create_material_variant_use_case,
    get_material_family_detail,
    list_material_families,
    search_materials as search_materials_use_case,
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
    # Роуты принимают Pydantic-модели из app.py во время сборки приложения.
    # Каталог материалов отделен от калькулятора, поэтому HTTP-слой только прокидывает команды в use-case.
    @app.get("/api/materials/families")
    async def material_families(request: Request, limit: int = 100) -> list[dict[str, Any]]:
        return await list_material_families(get_storage(request), limit=limit)

    @app.get("/api/materials/families/{family_id}")
    async def material_family_detail(request: Request, family_id: int) -> dict[str, Any]:
        return await get_material_family_detail(get_storage(request), family_id)

    @app.post("/api/materials/families")
    async def create_material_family(
        request: Request,
        payload: family_create_payload_model,
    ) -> dict[str, Any]:
        return await create_material_family_use_case(get_storage(request), payload)

    @app.post("/api/materials/variants")
    async def create_material_variant(
        request: Request,
        payload: variant_create_payload_model,
    ) -> dict[str, Any]:
        return await create_material_variant_use_case(get_storage(request), payload)

    @app.post("/api/materials/skus")
    async def create_material_sku(
        request: Request,
        payload: sku_create_payload_model,
    ) -> dict[str, Any]:
        return await create_material_sku_use_case(get_storage(request), payload)

    @app.post("/api/materials/aliases")
    async def create_material_alias(
        request: Request,
        payload: alias_create_payload_model,
    ) -> dict[str, Any]:
        return await create_material_alias_use_case(get_storage(request), payload)

    @app.get("/api/materials/search")
    async def search_materials(request: Request, q: str) -> list[dict[str, Any]]:
        return await search_materials_use_case(get_storage(request), q)
