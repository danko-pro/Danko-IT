from __future__ import annotations

from typing import Any

from sqlalchemy import delete, insert, select

from supply_bot.storage_requests.tables import group_message_history
from supply_bot.storage_scope import OwnerScopedSqlAlchemyRepository
from supply_bot.utils import normalize_text


class SqlAlchemyRequestHistoryRepository(OwnerScopedSqlAlchemyRepository):
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
        async with self._session_factory() as session:
            result = await session.execute(
                insert(group_message_history).values(
                    owner_user_id=self._owner_user_id,
                    chat_id=chat_id,
                    user_id=user_id,
                    user_name=user_name,
                    message_id=message_id,
                    text=text.strip(),
                    normalized_text=normalized_text,
                )
            )
            message_row_id = int(result.inserted_primary_key[0])
            recent_ids = (
                await session.execute(
                    select(group_message_history.c.id)
                    .where(self._read_owner_clause(group_message_history), group_message_history.c.chat_id == chat_id)
                    .order_by(group_message_history.c.id.desc())
                    .limit(60)
                )
            ).scalars().all()
            if recent_ids:
                await session.execute(
                    delete(group_message_history).where(
                        self._owner_clause(group_message_history),
                        group_message_history.c.chat_id == chat_id,
                        group_message_history.c.id.not_in(recent_ids),
                    )
                )
            await session.commit()
        return message_row_id

    async def list_recent_group_messages(
        self,
        *,
        chat_id: int,
        limit: int = 10,
        user_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = [self._read_owner_clause(group_message_history), group_message_history.c.chat_id == chat_id]
        if user_id is not None:
            clauses.append(group_message_history.c.user_id == user_id)
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    select(
                        group_message_history.c.id,
                        group_message_history.c.chat_id,
                        group_message_history.c.user_id,
                        group_message_history.c.user_name,
                        group_message_history.c.message_id,
                        group_message_history.c.text,
                        group_message_history.c.normalized_text,
                        group_message_history.c.created_at,
                        group_message_history.c.owner_user_id,
                    )
                    .where(*clauses)
                    .order_by(group_message_history.c.id.desc())
                    .limit(limit)
                )
            ).mappings().all()
        return [dict(row) for row in reversed(rows)]
