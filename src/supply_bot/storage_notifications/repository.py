from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, insert, select, update

from supply_bot.domain.notifications import (
    TELEGRAM_NOTIFICATION_PENDING,
    TELEGRAM_NOTIFICATION_SENT,
    TelegramNotification,
)
from supply_bot.storage_notifications.tables import telegram_notification_outbox
from supply_bot.storage_scope import OwnerScopedSqlAlchemyRepository


class SqlAlchemyTelegramNotificationRepository(OwnerScopedSqlAlchemyRepository):
    def _now_text(self) -> str:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    async def enqueue_telegram_notification(self, *, chat_id: int, text: str) -> int:
        async with self._session_factory() as session:
            result = await session.execute(
                insert(telegram_notification_outbox).values(
                    owner_user_id=self._owner_user_id,
                    chat_id=chat_id,
                    text=text,
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def get_telegram_notification(self, notification_id: int) -> TelegramNotification | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    self._notification_select()
                    .where(
                        self._owner_clause(telegram_notification_outbox),
                        telegram_notification_outbox.c.id == notification_id,
                    )
                    .limit(1)
                )
            ).mappings().first()
        return TelegramNotification.from_row(row) if row else None

    async def list_pending_telegram_notifications(self, *, limit: int = 20) -> list[TelegramNotification]:
        safe_limit = max(1, min(limit, 100))
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    self._notification_select()
                    .where(
                        self._owner_clause(telegram_notification_outbox),
                        telegram_notification_outbox.c.status == TELEGRAM_NOTIFICATION_PENDING,
                        telegram_notification_outbox.c.next_attempt_at <= self._now_text(),
                    )
                    .order_by(telegram_notification_outbox.c.created_at.asc(), telegram_notification_outbox.c.id.asc())
                    .limit(safe_limit)
                )
            ).mappings().all()
        return [TelegramNotification.from_row(row) for row in rows]

    async def list_telegram_notifications(
        self,
        *,
        status: str | None = None,
        limit: int = 50,
    ) -> list[TelegramNotification]:
        safe_limit = max(1, min(limit, 100))
        clauses = [self._owner_clause(telegram_notification_outbox)]
        if status:
            clauses.append(telegram_notification_outbox.c.status == status)
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    self._notification_select()
                    .where(*clauses)
                    .order_by(
                        telegram_notification_outbox.c.created_at.desc(),
                        telegram_notification_outbox.c.id.desc(),
                    )
                    .limit(safe_limit)
                )
            ).mappings().all()
        return [TelegramNotification.from_row(row) for row in rows]

    async def mark_telegram_notification_sent(self, notification_id: int) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(telegram_notification_outbox)
                .where(
                    self._owner_clause(telegram_notification_outbox),
                    telegram_notification_outbox.c.id == notification_id,
                )
                .values(
                    status=TELEGRAM_NOTIFICATION_SENT,
                    sent_at=func.current_timestamp(),
                    updated_at=func.current_timestamp(),
                )
            )
            await session.commit()

    async def mark_telegram_notification_failed(
        self,
        notification_id: int,
        *,
        error: str,
        retry_after_seconds: int = 60,
    ) -> None:
        next_attempt_at = (datetime.utcnow() + timedelta(seconds=max(1, retry_after_seconds))).strftime(
            "%Y-%m-%d %H:%M:%S"
        )
        async with self._session_factory() as session:
            await session.execute(
                update(telegram_notification_outbox)
                .where(
                    self._owner_clause(telegram_notification_outbox),
                    telegram_notification_outbox.c.id == notification_id,
                )
                .values(
                    attempts=telegram_notification_outbox.c.attempts + 1,
                    last_error=error[:1000],
                    next_attempt_at=next_attempt_at,
                    updated_at=func.current_timestamp(),
                )
            )
            await session.commit()

    def _notification_select(self):
        return select(
            telegram_notification_outbox.c.id,
            telegram_notification_outbox.c.chat_id,
            telegram_notification_outbox.c.text,
            telegram_notification_outbox.c.status,
            telegram_notification_outbox.c.attempts,
            telegram_notification_outbox.c.last_error,
            telegram_notification_outbox.c.next_attempt_at,
            telegram_notification_outbox.c.sent_at,
            telegram_notification_outbox.c.created_at,
            telegram_notification_outbox.c.updated_at,
        )
