from __future__ import annotations

from datetime import datetime
from typing import Any

from supply_bot.utils import normalize_text


class GroupRequestsStorageMixin:
    async def add_group_message(
        self,
        *,
        chat_id: int,
        user_id: int,
        user_name: str | None,
        text: str,
        message_id: int | None = None,
    ) -> int:
        normalized_text = normalize_text(text)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO group_message_history (
                    chat_id, user_id, user_name, message_id, text, normalized_text
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (chat_id, user_id, user_name, message_id, text.strip(), normalized_text),
            )
            await db.execute(
                """
                DELETE FROM group_message_history
                WHERE id NOT IN (
                    SELECT id
                    FROM group_message_history
                    WHERE chat_id = ?
                    ORDER BY id DESC
                    LIMIT 60
                )
                AND chat_id = ?
                """,
                (chat_id, chat_id),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def list_recent_group_messages(
        self,
        *,
        chat_id: int,
        limit: int = 10,
        user_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["chat_id = ?"]
        params: list[Any] = [chat_id]
        if user_id is not None:
            clauses.append("user_id = ?")
            params.append(user_id)
        params.append(limit)
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                SELECT id, chat_id, user_id, user_name, message_id, text, normalized_text, created_at
                FROM group_message_history
                WHERE {" AND ".join(clauses)}
                ORDER BY id DESC
                LIMIT ?
                """,
                params,
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in reversed(rows)]

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT chat_id, title, raw_description, object_name, address, flat, floor, elevator,
                       delivery_rules, delivery_start, delivery_end, delivery_fallback, updated_at
                FROM group_profiles
                WHERE chat_id = ?
                """,
                (chat_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def upsert_group_profile(self, profile: dict[str, Any]) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO group_profiles (
                    chat_id, title, raw_description, object_name, address, flat, floor, elevator,
                    delivery_rules, delivery_start, delivery_end, delivery_fallback, updated_at
                )
                VALUES (:chat_id, :title, :raw_description, :object_name, :address, :flat, :floor, :elevator,
                        :delivery_rules, :delivery_start, :delivery_end, :delivery_fallback, CURRENT_TIMESTAMP)
                ON CONFLICT(chat_id) DO UPDATE SET
                    title = excluded.title,
                    raw_description = excluded.raw_description,
                    object_name = excluded.object_name,
                    address = excluded.address,
                    flat = excluded.flat,
                    floor = excluded.floor,
                    elevator = excluded.elevator,
                    delivery_rules = excluded.delivery_rules,
                    delivery_start = excluded.delivery_start,
                    delivery_end = excluded.delivery_end,
                    delivery_fallback = excluded.delivery_fallback,
                    updated_at = CURRENT_TIMESTAMP
                """,
                profile,
            )
            await db.commit()

    async def get_active_draft(self, *, chat_id: int, master_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, chat_id, master_id, master_name, status, waiting_for, waiting_item_id,
                       requested_delivery_date, requested_delivery_time,
                       confirmed_delivery_date, confirmed_delivery_time,
                       proposed_delivery_date, proposed_delivery_time,
                       created_at, updated_at
                FROM request_drafts
                WHERE chat_id = ? AND master_id = ? AND status IN ('collecting', 'awaiting_confirmation')
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (chat_id, master_id),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def get_active_draft_for_chat(self, *, chat_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, chat_id, master_id, master_name, status, waiting_for, waiting_item_id,
                       requested_delivery_date, requested_delivery_time,
                       confirmed_delivery_date, confirmed_delivery_time,
                       proposed_delivery_date, proposed_delivery_time,
                       created_at, updated_at
                FROM request_drafts
                WHERE chat_id = ? AND status IN ('collecting', 'awaiting_confirmation')
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (chat_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def create_draft(self, *, chat_id: int, master_id: int, master_name: str) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO request_drafts (chat_id, master_id, master_name)
                VALUES (?, ?, ?)
                """,
                (chat_id, master_id, master_name),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, chat_id, master_id, master_name, status, waiting_for, waiting_item_id,
                       requested_delivery_date, requested_delivery_time,
                       confirmed_delivery_date, confirmed_delivery_time,
                       proposed_delivery_date, proposed_delivery_time,
                       created_at, updated_at
                FROM request_drafts
                WHERE id = ?
                """,
                (draft_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def get_or_create_active_draft(self, *, chat_id: int, master_id: int, master_name: str) -> dict[str, Any]:
        draft = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if draft:
            return draft
        await self.create_draft(chat_id=chat_id, master_id=master_id, master_name=master_name)
        fresh = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if fresh:
            return fresh
        raise RuntimeError("Не удалось создать черновик заявки.")

    async def update_draft_waiting(
        self,
        draft_id: int,
        *,
        waiting_for: str | None,
        waiting_item_id: int | None = None,
        proposed_delivery_date: str | None = None,
        proposed_delivery_time: str | None = None,
        status: str | None = None,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET waiting_for = ?,
                    waiting_item_id = ?,
                    proposed_delivery_date = ?,
                    proposed_delivery_time = ?,
                    status = COALESCE(?, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    waiting_for,
                    waiting_item_id,
                    proposed_delivery_date,
                    proposed_delivery_time,
                    status,
                    draft_id,
                ),
            )
            await db.commit()

    async def update_draft_delivery(
        self,
        draft_id: int,
        *,
        requested_date: str | None = None,
        requested_time: str | None = None,
        confirmed_date: str | None = None,
        confirmed_time: str | None = None,
        status: str | None = None,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET requested_delivery_date = COALESCE(?, requested_delivery_date),
                    requested_delivery_time = COALESCE(?, requested_delivery_time),
                    confirmed_delivery_date = COALESCE(?, confirmed_delivery_date),
                    confirmed_delivery_time = COALESCE(?, confirmed_delivery_time),
                    status = COALESCE(?, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    requested_date,
                    requested_time,
                    confirmed_date,
                    confirmed_time,
                    status,
                    draft_id,
                ),
            )
            await db.commit()

    async def set_draft_status(self, draft_id: int, *, status: str) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (status, draft_id),
            )
            await db.commit()

    async def update_draft_admin_fields(
        self,
        draft_id: int,
        *,
        status: str,
        waiting_for: str | None = None,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET status = ?,
                    waiting_for = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (status, waiting_for, draft_id),
            )
            await db.commit()

    async def touch_draft(self, draft_id: int) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (draft_id,),
            )
            await db.commit()

    async def delete_draft(self, draft_id: int) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM request_drafts WHERE id = ?", (draft_id,))
            await db.commit()

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

    async def replace_draft_delivery(
        self,
        draft_id: int,
        *,
        requested_date: str | None = None,
        requested_time: str | None = None,
        confirmed_date: str | None = None,
        confirmed_time: str | None = None,
        proposed_date: str | None = None,
        proposed_time: str | None = None,
        waiting_for: str | None = None,
        status: str | None = None,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE request_drafts
                SET requested_delivery_date = ?,
                    requested_delivery_time = ?,
                    confirmed_delivery_date = ?,
                    confirmed_delivery_time = ?,
                    proposed_delivery_date = ?,
                    proposed_delivery_time = ?,
                    waiting_for = ?,
                    status = COALESCE(?, status),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    requested_date,
                    requested_time,
                    confirmed_date,
                    confirmed_time,
                    proposed_date,
                    proposed_time,
                    waiting_for,
                    status,
                    draft_id,
                ),
            )
            await db.commit()
