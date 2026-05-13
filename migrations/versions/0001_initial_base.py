"""Initial database migration base.

Revision ID: 0001_initial_base
Revises:
Create Date: 2026-05-13
"""

from __future__ import annotations

from collections.abc import Sequence

revision: str = "0001_initial_base"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Domain tables move to Alembic in the storage migration phases.
    pass


def downgrade() -> None:
    pass
