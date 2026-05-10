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

    async def expire_stale_active_drafts(self, *, max_age_hours: int, chat_id: int | None = None) -> int:
        if max_age_hours <= 0:
            return 0
        clauses = [
            "status IN ('collecting', 'awaiting_confirmation')",
            "updated_at < datetime('now', ?)",
        ]
        params: list[Any] = [f"-{max_age_hours} hours"]
        if chat_id is not None:
            clauses.append("chat_id = ?")
            params.append(chat_id)
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                UPDATE request_drafts
                SET status = 'cancelled',
                    waiting_for = NULL,
                    waiting_item_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE {" AND ".join(clauses)}
                """,
                params,
            )
            await db.commit()
            return int(cursor.rowcount or 0)

    async def create_draft(self, *, chat_id: int, master_id: int, master_name: str) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO request_drafts (chat_id, master_id, master_name)
                VALUES (?, ?, ?)
                """,
                (chat_id, master_id, master_name),
            )
            draft_id = int(cursor.lastrowid)
            await db.execute(
                """
                INSERT OR IGNORE INTO request_draft_participants (draft_id, user_id, user_name, role)
                VALUES (?, ?, ?, 'owner')
                """,
                (draft_id, master_id, master_name),
            )
            await db.commit()
            return draft_id

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

    async def list_recent_request_summaries(self, *, limit: int = 20) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT
                    rd.id,
                    rd.chat_id,
                    rd.master_id,
                    rd.master_name,
                    rd.status,
                    rd.waiting_for,
                    rd.updated_at,
                    rd.confirmed_delivery_date,
                    rd.confirmed_delivery_time,
                    rd.requested_delivery_date,
                    rd.requested_delivery_time,
                    COALESCE(gp.object_name, gp.title, 'Без объекта') AS object_name,
                    COUNT(ri.id) AS items_count
                FROM request_drafts rd
                LEFT JOIN group_profiles gp ON gp.chat_id = rd.chat_id
                LEFT JOIN request_items ri ON ri.draft_id = rd.id
                GROUP BY rd.id, rd.chat_id, rd.master_id, rd.master_name, rd.status, rd.waiting_for,
                         rd.updated_at, rd.confirmed_delivery_date, rd.confirmed_delivery_time,
                         rd.requested_delivery_date, rd.requested_delivery_time, gp.object_name, gp.title
                ORDER BY rd.updated_at DESC
                LIMIT ?
                """,
                (safe_limit,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_or_create_active_draft(self, *, chat_id: int, master_id: int, master_name: str) -> dict[str, Any]:
        draft = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if draft:
            await self.add_draft_participant(
                draft_id=draft["id"],
                user_id=master_id,
                user_name=master_name,
                role="owner",
            )
            return draft
        await self.create_draft(chat_id=chat_id, master_id=master_id, master_name=master_name)
        fresh = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if fresh:
            return fresh
        raise RuntimeError("Не удалось создать черновик заявки.")

    async def add_draft_participant(
        self,
        *,
        draft_id: int,
        user_id: int,
        user_name: str | None,
        role: str = "participant",
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO request_draft_participants (draft_id, user_id, user_name, role)
                VALUES (?, ?, ?, ?)
                """,
                (draft_id, user_id, user_name, role),
            )
            await db.execute(
                """
                UPDATE request_draft_participants
                SET user_name = ?,
                    role = CASE WHEN ? = 'owner' THEN 'owner' ELSE role END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE draft_id = ? AND user_id = ?
                """,
                (user_name, role, draft_id, user_id),
            )
            await db.commit()

    async def is_draft_participant(self, *, draft_id: int, user_id: int) -> bool:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT 1
                FROM request_draft_participants
                WHERE draft_id = ? AND user_id = ?
                LIMIT 1
                """,
                (draft_id, user_id),
            )
            row = await cursor.fetchone()
        return row is not None

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
