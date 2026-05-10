from __future__ import annotations

import math
import re
from typing import Any

from fastapi import HTTPException

from supply_bot.utils import normalize_text


def build_material_family_values(payload) -> dict[str, Any]:
    canonical_name = payload.canonical_name.strip()
    default_unit = payload.default_unit.strip()
    if not canonical_name:
        raise HTTPException(status_code=400, detail="canonical_name is required")
    if not default_unit:
        raise HTTPException(status_code=400, detail="default_unit is required")

    return {
        "canonical_name": canonical_name,
        "default_unit": default_unit,
        "dialog_fields": [field.strip() for field in payload.dialog_fields if field.strip()],
        "category": payload.category.strip() if payload.category and payload.category.strip() else None,
    }


def split_material_alias_values(raw_value: str) -> list[str]:
    parts = [part.strip() for part in re.split(r"[,;\n]+", raw_value) if part.strip()]
    return parts or [raw_value.strip()]


async def require_material_family(storage_obj, family_id: int) -> dict[str, Any]:
    family = await storage_obj.get_family(family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family


async def require_material_variant(storage_obj, variant_id: int) -> dict[str, Any]:
    variant = await storage_obj.get_variant(variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    return variant


async def require_material_sku(storage_obj, sku_id: int) -> dict[str, Any]:
    sku = await storage_obj.get_sku(sku_id)
    if not sku:
        raise HTTPException(status_code=404, detail="SKU not found")
    return sku


def ensure_variant_belongs_to_family(variant: dict[str, Any], family_id: int) -> None:
    if int(variant["family_id"]) != family_id:
        raise HTTPException(status_code=400, detail="Variant does not belong to family")


def ensure_sku_matches_target(
    sku: dict[str, Any],
    *,
    family_id: int | None,
    variant_id: int | None,
) -> None:
    if family_id is not None and int(sku["family_id"]) != family_id:
        raise HTTPException(status_code=400, detail="SKU does not belong to family")
    if variant_id is not None and sku["variant_id"] != variant_id:
        raise HTTPException(status_code=400, detail="SKU does not belong to variant")


def ensure_positive_optional_number(value: float | None, field_name: str) -> float | None:
    if value is None:
        return None
    if not math.isfinite(value) or value <= 0:
        raise HTTPException(status_code=400, detail=f"{field_name} must be positive")
    return value


async def validate_material_sku_payload(storage_obj, payload) -> dict[str, Any]:
    await require_material_family(storage_obj, payload.family_id)

    if payload.variant_id is not None:
        variant = await require_material_variant(storage_obj, payload.variant_id)
        ensure_variant_belongs_to_family(variant, payload.family_id)

    title = payload.title.strip()
    unit = payload.unit.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    if not unit:
        raise HTTPException(status_code=400, detail="unit is required")

    return {
        "family_id": payload.family_id,
        "variant_id": payload.variant_id,
        "title": title,
        "article": payload.article.strip() if payload.article and payload.article.strip() else None,
        "brand": payload.brand.strip() if payload.brand and payload.brand.strip() else None,
        "unit": unit,
        "thickness_mm": ensure_positive_optional_number(payload.thickness_mm, "thickness_mm"),
        "length_mm": ensure_positive_optional_number(payload.length_mm, "length_mm"),
        "width_mm": ensure_positive_optional_number(payload.width_mm, "width_mm"),
        "source_description": payload.source_description.strip()
        if payload.source_description and payload.source_description.strip()
        else None,
    }


async def validate_material_alias_payload(storage_obj, payload) -> str:
    alias = payload.alias.strip()
    if not alias:
        raise HTTPException(status_code=400, detail="alias is required")

    if payload.family_id is None and payload.variant_id is None and payload.sku_id is None:
        raise HTTPException(status_code=400, detail="Target family, variant or sku is required")

    if payload.family_id is not None:
        await require_material_family(storage_obj, payload.family_id)

    if payload.variant_id is not None:
        variant = await require_material_variant(storage_obj, payload.variant_id)
        if payload.family_id is not None:
            ensure_variant_belongs_to_family(variant, payload.family_id)

    if payload.sku_id is not None:
        sku = await require_material_sku(storage_obj, payload.sku_id)
        ensure_sku_matches_target(
            sku,
            family_id=payload.family_id,
            variant_id=payload.variant_id,
        )

    return alias


async def search_material_catalog(storage_obj, query: str) -> list[dict[str, Any]]:
    normalized_query = normalize_text(query)
    if len(normalized_query) < 2:
        return []

    needle = f"%{normalized_query}%"
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
