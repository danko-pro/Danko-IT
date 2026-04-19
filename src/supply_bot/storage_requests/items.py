from __future__ import annotations

from datetime import datetime
from typing import Any

# Позиции заявки и их изменение в процессе dialogue/admin редактирования.


class RequestItemsStorageMixin:
    async def create_request_item(
        self,
        *,
        draft_id: int,
        family_id: int | None,
        variant_id: int | None,
        sku_id: int | None,
        raw_name: str,
        normalized_name: str | None,
        quantity: float | None = None,
        unit: str | None = None,
        thickness_mm: float | None = None,
        length_mm: float | None = None,
        width_mm: float | None = None,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO request_items (
                    draft_id, family_id, variant_id, sku_id, raw_name, normalized_name,
                    quantity, unit, thickness_mm, length_mm, width_mm, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    draft_id,
                    family_id,
                    variant_id,
                    sku_id,
                    raw_name,
                    normalized_name,
                    quantity,
                    unit,
                    thickness_mm,
                    length_mm,
                    width_mm,
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def get_request_item(self, item_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, draft_id, family_id, variant_id, sku_id, raw_name, normalized_name,
                       quantity, unit, thickness_mm, length_mm, width_mm, note, status
                FROM request_items
                WHERE id = ?
                """,
                (item_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT ri.id, ri.draft_id, ri.family_id, ri.variant_id, ri.sku_id, ri.raw_name,
                       ri.normalized_name, ri.quantity, ri.unit, ri.thickness_mm, ri.length_mm,
                       ri.width_mm, ri.note, ri.status,
                       mf.canonical_name AS family_name,
                       mv.display_name AS variant_name,
                       ms.title AS sku_title
                FROM request_items ri
                LEFT JOIN material_families mf ON mf.id = ri.family_id
                LEFT JOIN material_variants mv ON mv.id = ri.variant_id
                LEFT JOIN material_skus ms ON ms.id = ri.sku_id
                WHERE ri.draft_id = ?
                ORDER BY ri.id
                """,
                (draft_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def update_request_item(self, item_id: int, **fields: Any) -> None:
        if not fields:
            return
        fields["updated_at"] = datetime.utcnow().isoformat(timespec="seconds")
        columns = []
        params: list[Any] = []
        for key, value in fields.items():
            columns.append(f"{key} = ?")
            params.append(value)
        params.append(item_id)

        async with self.connection() as db:
            await db.execute(
                f"UPDATE request_items SET {', '.join(columns)} WHERE id = ?",
                params,
            )
            await db.commit()

    async def delete_request_item(self, item_id: int) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM request_items WHERE id = ?", (item_id,))
            await db.commit()

    async def clear_request_items(self, draft_id: int) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM request_items WHERE draft_id = ?", (draft_id,))
            await db.commit()
