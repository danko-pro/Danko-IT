from __future__ import annotations

from sqlalchemy import Column, Float, ForeignKey, Index, Integer, Table, Text, text

import supply_bot.storage_auth.tables  # noqa: F401
import supply_bot.storage_catalog.tables  # noqa: F401
from supply_bot.database.metadata import metadata

request_drafts = Table(
    "request_drafts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("chat_id", Integer, nullable=False),
    Column("master_id", Integer, nullable=False),
    Column("master_name", Text, nullable=False),
    Column("status", Text, nullable=False, server_default=text("'collecting'")),
    Column("waiting_for", Text, nullable=True),
    Column("waiting_item_id", Integer, nullable=True),
    Column("requested_delivery_date", Text, nullable=True),
    Column("requested_delivery_time", Text, nullable=True),
    Column("confirmed_delivery_date", Text, nullable=True),
    Column("confirmed_delivery_time", Text, nullable=True),
    Column("proposed_delivery_date", Text, nullable=True),
    Column("proposed_delivery_time", Text, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

request_draft_participants = Table(
    "request_draft_participants",
    metadata,
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("draft_id", Integer, ForeignKey("request_drafts.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, primary_key=True),
    Column("user_name", Text, nullable=True),
    Column("role", Text, nullable=False, server_default=text("'participant'")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

request_items = Table(
    "request_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("draft_id", Integer, ForeignKey("request_drafts.id", ondelete="CASCADE"), nullable=False),
    Column("family_id", Integer, ForeignKey("material_families.id", ondelete="SET NULL"), nullable=True),
    Column("variant_id", Integer, ForeignKey("material_variants.id", ondelete="SET NULL"), nullable=True),
    Column("sku_id", Integer, ForeignKey("material_skus.id", ondelete="SET NULL"), nullable=True),
    Column("raw_name", Text, nullable=False),
    Column("normalized_name", Text, nullable=True),
    Column("material_name_snapshot", Text, nullable=True),
    Column("unit_snapshot", Text, nullable=True),
    Column("quantity", Float, nullable=True),
    Column("unit", Text, nullable=True),
    Column("thickness_mm", Float, nullable=True),
    Column("length_mm", Float, nullable=True),
    Column("width_mm", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("status", Text, nullable=False, server_default=text("'active'")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

group_profiles = Table(
    "group_profiles",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("chat_id", Integer, nullable=False),
    Column("title", Text, nullable=True),
    Column("raw_description", Text, nullable=True),
    Column("object_name", Text, nullable=True),
    Column("address", Text, nullable=True),
    Column("flat", Text, nullable=True),
    Column("floor", Text, nullable=True),
    Column("elevator", Text, nullable=True),
    Column("delivery_rules", Text, nullable=True),
    Column("delivery_start", Text, nullable=True),
    Column("delivery_end", Text, nullable=True),
    Column("delivery_fallback", Text, nullable=True),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

group_message_history = Table(
    "group_message_history",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("chat_id", Integer, nullable=False),
    Column("user_id", Integer, nullable=False),
    Column("user_name", Text, nullable=True),
    Column("message_id", Integer, nullable=True),
    Column("text", Text, nullable=False),
    Column("normalized_text", Text, nullable=False),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

Index("ix_request_drafts_owner_user_id", request_drafts.c.owner_user_id)
Index("ix_request_drafts_active", request_drafts.c.owner_user_id, request_drafts.c.chat_id, request_drafts.c.status)
Index("ix_request_items_owner_user_id", request_items.c.owner_user_id)
Index("ix_request_items_draft_id", request_items.c.draft_id)
Index("ix_request_draft_participants_user", request_draft_participants.c.user_id, request_draft_participants.c.draft_id)
Index(
    "uq_group_profiles_global_chat",
    group_profiles.c.chat_id,
    unique=True,
    postgresql_where=group_profiles.c.owner_user_id.is_(None),
    sqlite_where=group_profiles.c.owner_user_id.is_(None),
)
Index(
    "uq_group_profiles_owner_chat",
    group_profiles.c.owner_user_id,
    group_profiles.c.chat_id,
    unique=True,
    postgresql_where=group_profiles.c.owner_user_id.is_not(None),
    sqlite_where=group_profiles.c.owner_user_id.is_not(None),
)
Index("ix_group_message_history_owner_chat", group_message_history.c.owner_user_id, group_message_history.c.chat_id)
