from __future__ import annotations

from supply_bot.utils import normalize_text

# Поисковый фасад по разным сущностям каталога.


class CatalogSearchStorageMixin:
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
