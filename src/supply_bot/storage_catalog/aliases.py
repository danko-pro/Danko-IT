from __future__ import annotations

from typing import Any

from supply_bot.utils import normalize_text

# Слой синонимов и матчей raw-терминов к объектам каталога.


class CatalogAliasesStorageMixin:
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
