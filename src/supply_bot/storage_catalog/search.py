from __future__ import annotations

from typing import Any

from supply_bot.utils import normalize_text

# Поисковый фасад по разным сущностям каталога.


class CatalogSearchStorageMixin:
    async def search_material_targets(self, query: str) -> list[dict[str, Any]]:
        normalized_query = normalize_text(query)
        if len(normalized_query) < 2:
            return []

        needle = f"%{normalized_query}%"
        async with self.connection() as db:
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

    async def search_catalog(self, query: str) -> list[dict[str, int | str]]:
        needle = f"%{normalize_text(query)}%"
        async with self.connection() as db:
            results: list[dict[str, int | str]] = []
            cursor = await db.execute(
                """
                SELECT id, canonical_name AS title
                FROM material_families
                WHERE LOWER(canonical_name) LIKE ?
                ORDER BY canonical_name COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append({"type": "family", "id": row["id"], "title": row["title"]})

            cursor = await db.execute(
                """
                SELECT id, display_name AS title
                FROM material_variants
                WHERE LOWER(display_name) LIKE ?
                ORDER BY display_name COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append({"type": "variant", "id": row["id"], "title": row["title"]})

            cursor = await db.execute(
                """
                SELECT id, title
                FROM material_skus
                WHERE LOWER(title) LIKE ? OR LOWER(COALESCE(supplier_article, '')) LIKE ?
                ORDER BY title COLLATE NOCASE
                LIMIT 10
                """,
                (needle, needle),
            )
            for row in await cursor.fetchall():
                results.append({"type": "sku", "id": row["id"], "title": row["title"]})

            cursor = await db.execute(
                """
                SELECT id, alias AS title
                FROM material_aliases
                WHERE normalized_alias LIKE ?
                ORDER BY alias COLLATE NOCASE
                LIMIT 10
                """,
                (needle,),
            )
            for row in await cursor.fetchall():
                results.append({"type": "alias", "id": row["id"], "title": row["title"]})
        return results[:20]
