# pyright: reportInvalidTypeForm=false
# mypy: disable-error-code=valid-type

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.app_helpers import _family_overview, _split_alias_values
from supply_bot.admin_api.deps import get_storage
from supply_bot.utils import normalize_text


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
        canonical_name = payload.canonical_name.strip()
        default_unit = payload.default_unit.strip()
        if not canonical_name:
            raise HTTPException(status_code=400, detail="canonical_name is required")
        if not default_unit:
            raise HTTPException(status_code=400, detail="default_unit is required")

        family_id = await storage_obj.create_family(
            canonical_name=canonical_name,
            default_unit=default_unit,
            dialog_fields=[field.strip() for field in payload.dialog_fields if field.strip()],
            category=payload.category.strip() if payload.category and payload.category.strip() else None,
        )
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
        family = await storage_obj.get_family(payload.family_id)
        if not family:
            raise HTTPException(status_code=404, detail="Family not found")
        display_name = payload.display_name.strip()
        if not display_name:
            raise HTTPException(status_code=400, detail="display_name is required")
        variant_id = await storage_obj.create_variant(payload.family_id, display_name)
        variant = await storage_obj.get_variant(variant_id)
        if not variant:
            raise HTTPException(status_code=500, detail="Variant was not created")
        return variant

    @app.post("/api/materials/skus")
    async def create_material_sku(
        request: Request,
        payload: sku_create_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_storage(request)
        family = await storage_obj.get_family(payload.family_id)
        if not family:
            raise HTTPException(status_code=404, detail="Family not found")
        if payload.variant_id is not None:
            variant = await storage_obj.get_variant(payload.variant_id)
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")
            if int(variant["family_id"]) != payload.family_id:
                raise HTTPException(status_code=400, detail="Variant does not belong to family")

        title = payload.title.strip()
        unit = payload.unit.strip()
        if not title:
            raise HTTPException(status_code=400, detail="title is required")
        if not unit:
            raise HTTPException(status_code=400, detail="unit is required")

        sku_id = await storage_obj.create_sku(
            family_id=payload.family_id,
            variant_id=payload.variant_id,
            title=title,
            article=payload.article.strip() if payload.article and payload.article.strip() else None,
            brand=payload.brand.strip() if payload.brand and payload.brand.strip() else None,
            unit=unit,
            thickness_mm=payload.thickness_mm,
            length_mm=payload.length_mm,
            width_mm=payload.width_mm,
            source_description=payload.source_description.strip()
            if payload.source_description and payload.source_description.strip()
            else None,
        )
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
        alias = payload.alias.strip()
        if not alias:
            raise HTTPException(status_code=400, detail="alias is required")

        if payload.family_id is None and payload.variant_id is None and payload.sku_id is None:
            raise HTTPException(status_code=400, detail="Target family, variant or sku is required")

        if payload.family_id is not None:
            family = await storage_obj.get_family(payload.family_id)
            if not family:
                raise HTTPException(status_code=404, detail="Family not found")

        if payload.variant_id is not None:
            variant = await storage_obj.get_variant(payload.variant_id)
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")

        if payload.sku_id is not None:
            sku = await storage_obj.get_sku(payload.sku_id)
            if not sku:
                raise HTTPException(status_code=404, detail="SKU not found")

        await storage_obj.create_alias(
            alias,
            family_id=payload.family_id,
            variant_id=payload.variant_id,
            sku_id=payload.sku_id,
            priority=payload.priority,
        )

        return {
            "created_count": len(_split_alias_values(alias)),
            "family_id": payload.family_id,
            "variant_id": payload.variant_id,
            "sku_id": payload.sku_id,
        }

    @app.get("/api/materials/search")
    async def search_materials(request: Request, q: str) -> list[dict[str, Any]]:
        storage_obj = get_storage(request)
        needle = f"%{normalize_text(q)}%"
        if len(normalize_text(q)) < 2:
            return []

        async with storage_obj.connection() as db:
            results: list[dict[str, Any]] = []

            cursor = await db.execute(
                """
                SELECT id, canonical_name AS title, id AS family_id
                FROM material_families
                WHERE LOWER(canonical_name) LIKE ?
                ORDER BY canonical_name COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append(
                    {
                        "type": "family",
                        "id": row["id"],
                        "title": row["title"],
                        "family_id": row["family_id"],
                        "variant_id": None,
                        "sku_id": None,
                    }
                )

            cursor = await db.execute(
                """
                SELECT id, family_id, display_name AS title
                FROM material_variants
                WHERE LOWER(display_name) LIKE ?
                ORDER BY display_name COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append(
                    {
                        "type": "variant",
                        "id": row["id"],
                        "title": row["title"],
                        "family_id": row["family_id"],
                        "variant_id": row["id"],
                        "sku_id": None,
                    }
                )

            cursor = await db.execute(
                """
                SELECT id, family_id, variant_id, title
                FROM material_skus
                WHERE LOWER(title) LIKE ? OR LOWER(COALESCE(supplier_article, '')) LIKE ?
                ORDER BY title COLLATE NOCASE
                LIMIT 10
                """,
                (needle, needle),
            )
            for row in await cursor.fetchall():
                results.append(
                    {
                        "type": "sku",
                        "id": row["id"],
                        "title": row["title"],
                        "family_id": row["family_id"],
                        "variant_id": row["variant_id"],
                        "sku_id": row["id"],
                    }
                )

            cursor = await db.execute(
                """
                SELECT id, alias AS title, family_id, variant_id, sku_id
                FROM material_aliases
                WHERE normalized_alias LIKE ?
                ORDER BY alias COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append(
                    {
                        "type": "alias",
                        "id": row["id"],
                        "title": row["title"],
                        "family_id": row["family_id"],
                        "variant_id": row["variant_id"],
                        "sku_id": row["sku_id"],
                    }
                )

        return results[:20]
