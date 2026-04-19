from __future__ import annotations

from typing import Any

from supply_bot.utils import json_dumps

# Операции каталога верхнего уровня: семейства и их варианты.


class CatalogFamiliesStorageMixin:
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
