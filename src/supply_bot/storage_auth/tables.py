from __future__ import annotations

from sqlalchemy import Column, Integer, Table, Text, text

from supply_bot.database.metadata import metadata

app_users = Table(
    "app_users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("email", Text, nullable=False, unique=True),
    Column("display_name", Text, nullable=False, server_default=text("''")),
    Column("password_hash", Text, nullable=False),
    Column("role", Text, nullable=False, server_default=text("'user'")),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("last_login_at", Text),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

__all__ = ["app_users"]
