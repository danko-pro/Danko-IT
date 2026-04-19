from __future__ import annotations

from typing import Any

from supply_bot.utils import normalize_text

# Хранилище неизвестных терминов, которые потом разбираются админкой.


class CatalogUnknownTermsStorageMixin:
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
