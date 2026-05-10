from __future__ import annotations

from typing import Any


class TelegramNotificationOutboxStorageMixin:
    async def enqueue_telegram_notification(self, *, chat_id: int, text: str) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO telegram_notification_outbox (chat_id, text)
                VALUES (?, ?)
                """,
                (chat_id, text),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def get_telegram_notification(self, notification_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, chat_id, text, status, attempts, last_error, next_attempt_at,
                       sent_at, created_at, updated_at
                FROM telegram_notification_outbox
                WHERE id = ?
                """,
                (notification_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def list_pending_telegram_notifications(self, *, limit: int = 20) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, chat_id, text, status, attempts, last_error, next_attempt_at,
                       sent_at, created_at, updated_at
                FROM telegram_notification_outbox
                WHERE status = 'pending'
                  AND datetime(next_attempt_at) <= datetime('now')
                ORDER BY created_at ASC, id ASC
                LIMIT ?
                """,
                (safe_limit,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def list_telegram_notifications(
        self,
        *,
        status: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        clauses = ["1 = 1"]
        params: list[Any] = []
        if status:
            clauses.append("status = ?")
            params.append(status)
        params.append(safe_limit)
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                SELECT id, chat_id, text, status, attempts, last_error, next_attempt_at,
                       sent_at, created_at, updated_at
                FROM telegram_notification_outbox
                WHERE {" AND ".join(clauses)}
                ORDER BY created_at DESC, id DESC
                LIMIT ?
                """,
                params,
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def mark_telegram_notification_sent(self, notification_id: int) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE telegram_notification_outbox
                SET status = 'sent',
                    sent_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (notification_id,),
            )
            await db.commit()

    async def mark_telegram_notification_failed(
        self,
        notification_id: int,
        *,
        error: str,
        retry_after_seconds: int = 60,
    ) -> None:
        retry_modifier = f"+{max(1, retry_after_seconds)} seconds"
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE telegram_notification_outbox
                SET attempts = attempts + 1,
                    last_error = ?,
                    next_attempt_at = datetime('now', ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (error[:1000], retry_modifier, notification_id),
            )
            await db.commit()
