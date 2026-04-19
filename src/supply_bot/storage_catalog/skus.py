from __future__ import annotations

from typing import Any

from supply_bot.utils import json_dumps

# Операции по SKU и их first-party атрибутам.


class CatalogSkusStorageMixin:
    async def list_skus(
        self,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["1 = 1"]
        params: list[Any] = []
        if family_id is not None:
            clauses.append("family_id = ?")
            params.append(family_id)
        if variant_id is not None:
            clauses.append("variant_id = ?")
            params.append(variant_id)

        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                SELECT id, family_id, variant_id, title, brand, supplier, supplier_article, unit,
                       length_mm, width_mm, thickness_mm, area_m2, extra_json, source_description, is_active
                FROM material_skus
                WHERE {" AND ".join(clauses)}
                ORDER BY title COLLATE NOCASE
                """,
                params,
            )
            rows = await cursor.fetchall()
        return [self._sku_row(row) for row in rows]

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, family_id, variant_id, title, brand, supplier, supplier_article, unit,
                       length_mm, width_mm, thickness_mm, area_m2, extra_json, source_description, is_active
                FROM material_skus
                WHERE id = ?
                """,
                (sku_id,),
            )
            row = await cursor.fetchone()
        return self._sku_row(row) if row else None

    async def create_sku(
        self,
        *,
        family_id: int,
        variant_id: int | None,
        title: str,
        article: str | None,
        brand: str | None,
        unit: str,
        thickness_mm: float | None,
        length_mm: float | None,
        width_mm: float | None,
        source_description: str | None = None,
        supplier: str = "manual",
        extra: dict[str, Any] | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO material_skus (
                    family_id, variant_id, title, brand, supplier, supplier_article, unit,
                    length_mm, width_mm, thickness_mm, extra_json, source_description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    family_id,
                    variant_id,
                    title.strip(),
                    brand.strip() if brand else None,
                    supplier,
                    article.strip() if article else None,
                    unit,
                    length_mm,
                    width_mm,
                    thickness_mm,
                    json_dumps(extra or {}),
                    source_description.strip() if source_description else None,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def set_sku_active(self, sku_id: int, *, is_active: bool) -> None:
        async with self.connection() as db:
            await db.execute(
                "UPDATE material_skus SET is_active = ? WHERE id = ?",
                (1 if is_active else 0, sku_id),
            )
            await db.commit()
