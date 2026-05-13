from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Index, Integer, Table, Text, text

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata

telegram_notification_outbox = Table(
    "telegram_notification_outbox",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("chat_id", Integer, nullable=False),
    Column("text", Text, nullable=False),
    Column("status", Text, nullable=False, server_default=text("'pending'")),
    Column("attempts", Integer, nullable=False, server_default=text("0")),
    Column("last_error", Text, nullable=True),
    Column("next_attempt_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("sent_at", Text, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

Index(
    "ix_telegram_notification_outbox_pending",
    telegram_notification_outbox.c.owner_user_id,
    telegram_notification_outbox.c.status,
    telegram_notification_outbox.c.next_attempt_at,
    telegram_notification_outbox.c.id,
)
