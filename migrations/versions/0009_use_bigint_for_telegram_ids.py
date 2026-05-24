"""Use bigint for Telegram identifiers.

Revision ID: 0009_use_bigint_for_telegram_ids
Revises: 0008_add_project_tax_settings
Create Date: 2026-05-24
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009_use_bigint_for_telegram_ids"
down_revision = "0008_add_project_tax_settings"
branch_labels = None
depends_on = None

TELEGRAM_ID_COLUMNS = (
    ("request_drafts", "chat_id"),
    ("request_drafts", "master_id"),
    ("request_draft_participants", "user_id"),
    ("group_profiles", "chat_id"),
    ("group_message_history", "chat_id"),
    ("group_message_history", "user_id"),
    ("telegram_notification_outbox", "chat_id"),
)


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table_name, column_name in TELEGRAM_ID_COLUMNS:
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.Integer(),
            type_=sa.BigInteger(),
            existing_nullable=False,
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table_name, column_name in reversed(TELEGRAM_ID_COLUMNS):
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.BigInteger(),
            type_=sa.Integer(),
            existing_nullable=False,
        )
