from __future__ import annotations

from typing import Any

# Черновики заявок и их жизненный цикл до подтверждения.


class RequestDraftsStorageMixin:
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
