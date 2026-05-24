from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, Table, Text, text

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata
from supply_bot.domain.public_leads import (
    PUBLIC_LEAD_SOURCE_PUBLIC_LANDING,
    PUBLIC_LEAD_STATUS_NEW,
    PUBLIC_LEAD_TELEGRAM_NOT_SENT,
)

public_leads = Table(
    "public_leads",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", Text, nullable=False),
    Column("contact", Text, nullable=False),
    Column("contact_method", Text, nullable=False, server_default=text("''")),
    Column("object_type", Text, nullable=False, server_default=text("''")),
    Column("area", Text, nullable=False, server_default=text("''")),
    Column("package_type", Text, nullable=False, server_default=text("''")),
    Column("comment", Text, nullable=False, server_default=text("''")),
    Column("source", Text, nullable=False, server_default=text(f"'{PUBLIC_LEAD_SOURCE_PUBLIC_LANDING}'")),
    Column("status", Text, nullable=False, server_default=text(f"'{PUBLIC_LEAD_STATUS_NEW}'")),
    Column("personal_data_consent", Boolean, nullable=False, server_default=text("true")),
    Column("telegram_delivery_status", Text, nullable=False, server_default=text(f"'{PUBLIC_LEAD_TELEGRAM_NOT_SENT}'")),
    Column("telegram_message_id", Integer, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("reviewed_by", Integer, ForeignKey("app_users.id", ondelete="SET NULL"), nullable=True),
    Column("reviewed_at", Text, nullable=True),
)

Index("ix_public_leads_status_created_at", public_leads.c.status, public_leads.c.created_at, public_leads.c.id)
Index("ix_public_leads_created_at", public_leads.c.created_at, public_leads.c.id)
