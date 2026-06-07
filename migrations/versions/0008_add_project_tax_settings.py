"""Add project tax settings.

Revision ID: 0008_add_project_tax_settings
Revises: 0007_create_estimate_ceilings
Create Date: 2026-05-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008_add_project_tax_settings"
down_revision = "0007_create_estimate_ceilings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.add_column(
            sa.Column(
                "tax_rate_percent",
                sa.Float(),
                nullable=False,
                server_default=sa.text("0"),
            )
        )
        batch_op.add_column(
            sa.Column(
                "tax_base_mode",
                sa.Text(),
                nullable=False,
                server_default=sa.text("'received_total'"),
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch_op:
        batch_op.drop_column("tax_base_mode")
        batch_op.drop_column("tax_rate_percent")
