from __future__ import annotations

from typing import Any

from supply_bot.utils import normalize_text

# История сообщений групп для контекстного восстановления диалога.


class RequestHistoryStorageMixin:
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
