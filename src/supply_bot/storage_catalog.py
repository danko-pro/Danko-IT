from __future__ import annotations

import re
from typing import Any

import aiosqlite

from supply_bot.utils import json_dumps, json_loads, normalize_text, slugify


class CatalogStorageMixin:
    async def list_families(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, code, canonical_name, category, default_unit, dialog_fields_json, is_active
                FROM material_families
                ORDER BY canonical_name COLLATE NOCASE
                """
            )
            rows = await cursor.fetchall()
        return [self._family_row(row) for row in rows]

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, code, canonical_name, category, default_unit, dialog_fields_json, is_active
                FROM material_families
                WHERE id = ?
                """,
                (family_id,),
            )
            row = await cursor.fetchone()
        return self._family_row(row) if row else None

    async def create_family(
        self,
        *,
        canonical_name: str,
        default_unit: str,
        dialog_fields: list[str],
        category: str | None = None,
    ) -> int:
        code = await self._unique_code("material_families", canonical_name, prefix="family")
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO material_families (code, canonical_name, category, default_unit, dialog_fields_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (code, canonical_name.strip(), category, default_unit, json_dumps(dialog_fields)),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def update_family_dialog_fields(self, family_id: int, dialog_fields: list[str]) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE material_families
                SET dialog_fields_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (json_dumps(dialog_fields), family_id),
            )
            await db.commit()

    async def set_family_active(self, family_id: int, *, is_active: bool) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE material_families
                SET is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (1 if is_active else 0, family_id),
            )
            await db.commit()

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, family_id, code, display_name, is_active
                FROM material_variants
                WHERE family_id = ?
                ORDER BY display_name COLLATE NOCASE
                """,
                (family_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, family_id, code, display_name, is_active
                FROM material_variants
                WHERE id = ?
                """,
                (variant_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def create_variant(self, family_id: int, display_name: str) -> int:
        code = await self._unique_code("material_variants", display_name, prefix="variant", family_id=family_id)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO material_variants (family_id, code, display_name)
                VALUES (?, ?, ?)
                """,
                (family_id, code, display_name.strip()),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def set_variant_active(self, variant_id: int, *, is_active: bool) -> None:
        async with self.connection() as db:
            await db.execute(
                "UPDATE material_variants SET is_active = ? WHERE id = ?",
                (1 if is_active else 0, variant_id),
            )
            await db.commit()

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

    async def list_aliases(
        self,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
        sku_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["1 = 1"]
        params: list[Any] = []
        if family_id is not None:
            clauses.append("family_id = ?")
            params.append(family_id)
        if variant_id is not None:
            clauses.append("variant_id = ?")
            params.append(variant_id)
        if sku_id is not None:
            clauses.append("sku_id = ?")
            params.append(sku_id)

        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                SELECT id, alias, normalized_alias, family_id, variant_id, sku_id, priority, is_active
                FROM material_aliases
                WHERE {" AND ".join(clauses)}
                ORDER BY priority ASC, alias COLLATE NOCASE
                """,
                params,
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_alias(
        self,
        alias: str,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
        sku_id: int | None = None,
        priority: int = 100,
    ) -> int:
        aliases = self._split_alias_input(alias)
        first_id: int | None = None
        async with self.connection() as db:
            for alias_value in aliases:
                normalized_alias = normalize_text(alias_value)
                cursor = await db.execute(
                    """
                    INSERT INTO material_aliases (alias, normalized_alias, family_id, variant_id, sku_id, priority)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (alias_value, normalized_alias, family_id, variant_id, sku_id, priority),
                )
                if first_id is None:
                    first_id = int(cursor.lastrowid)
            await db.commit()
            return first_id or 0

    async def set_alias_active(self, alias_id: int, *, is_active: bool) -> None:
        async with self.connection() as db:
            await db.execute(
                "UPDATE material_aliases SET is_active = ? WHERE id = ?",
                (1 if is_active else 0, alias_id),
            )
            await db.commit()

    async def find_alias_matches(self, text: str) -> list[dict[str, Any]]:
        normalized_text = normalize_text(text)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, alias, normalized_alias, family_id, variant_id, sku_id, priority
                FROM material_aliases
                WHERE is_active = 1
                ORDER BY LENGTH(normalized_alias) DESC, priority ASC
                """
            )
            rows = await cursor.fetchall()
        matches: list[dict[str, Any]] = []
        for row in rows:
            candidates = self._split_alias_input(row["alias"])
            for candidate in candidates:
                normalized_alias = normalize_text(candidate)
                if normalized_alias and normalized_alias in normalized_text:
                    payload = dict(row)
                    payload["alias"] = candidate
                    payload["normalized_alias"] = normalized_alias
                    matches.append(payload)
        return matches

    async def search_catalog(self, query: str) -> list[dict[str, Any]]:
        needle = f"%{normalize_text(query)}%"
        async with self.connection() as db:
            results: list[dict[str, Any]] = []
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

    async def list_unknown_terms(self, *, limit: int = 20) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT
                    id, raw_term, normalized_term, full_message,
                    chat_id, message_id, guessed_family_id, status, created_at
                FROM unknown_terms
                WHERE status = 'new'
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_unknown_term(self, unknown_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT
                    id, raw_term, normalized_term, full_message,
                    chat_id, message_id, guessed_family_id, status, created_at
                FROM unknown_terms
                WHERE id = ?
                """,
                (unknown_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def add_unknown_term(
        self,
        *,
        raw_term: str,
        full_message: str,
        chat_id: int,
        message_id: int | None = None,
        guessed_family_id: int | None = None,
    ) -> int:
        normalized_term = normalize_text(raw_term)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO unknown_terms (
                    raw_term, normalized_term, full_message, chat_id, message_id, guessed_family_id
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (raw_term.strip(), normalized_term, full_message.strip(), chat_id, message_id, guessed_family_id),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def mark_unknown_term(self, unknown_id: int, *, status: str) -> None:
        async with self.connection() as db:
            await db.execute(
                "UPDATE unknown_terms SET status = ? WHERE id = ?",
                (status, unknown_id),
            )
            await db.commit()

    def _family_row(self, row: aiosqlite.Row | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["dialog_fields"] = json_loads(data.pop("dialog_fields_json"), default=[])
        return data

    def _sku_row(self, row: aiosqlite.Row | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["extra"] = json_loads(data.pop("extra_json"), default={})
        return data

    async def _unique_code(
        self,
        table: str,
        title: str,
        *,
        prefix: str,
        family_id: int | None = None,
    ) -> str:
        base = slugify(title, prefix=prefix)
        candidate = base
        index = 2

        while True:
            async with self.connection() as db:
                if table == "material_variants":
                    cursor = await db.execute(
                        "SELECT 1 FROM material_variants WHERE family_id = ? AND code = ?",
                        (family_id, candidate),
                    )
                else:
                    cursor = await db.execute(f"SELECT 1 FROM {table} WHERE code = ?", (candidate,))
                exists = await cursor.fetchone()
            if not exists:
                return candidate
            candidate = f"{base}_{index}"
            index += 1

    def _split_alias_input(self, raw_value: str) -> list[str]:
        parts = [part.strip() for part in re.split(r"[,;\n]+", raw_value) if part.strip()]
        return parts or [raw_value.strip()]
