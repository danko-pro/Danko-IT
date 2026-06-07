"""Add flooring layout labor price.

Revision ID: 0014_flooring_layout_labor
Revises: 0013_flooring_catalog_assemblies
Create Date: 2026-06-08
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014_flooring_layout_labor"
down_revision: str = "0013_flooring_catalog_assemblies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEFAULT_LAYOUT_LABOR_RATES = (
    ("Прямая", 1000),
    ("Крупный формат", 2000),
    ("Клеевая", 800),
    ("Плавающая", 1000),
    ("Разбежка", 1100),
    ("Диагональ", 1300),
    ("Ёлка", 1600),
    ("Елка", 1600),
    ("Сложная", 1800),
)


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _has_column("estimate_flooring_layouts", "labor_price_per_m2"):
        with op.batch_alter_table("estimate_flooring_layouts") as batch_op:
            batch_op.add_column(
                sa.Column(
                    "labor_price_per_m2",
                    sa.Float(),
                    nullable=False,
                    server_default=sa.text("0"),
                )
            )

    connection = op.get_bind()
    for title, labor_price_per_m2 in _DEFAULT_LAYOUT_LABOR_RATES:
        connection.execute(
            sa.text(
                """
                UPDATE estimate_flooring_layouts
                SET labor_price_per_m2 = :labor_price_per_m2
                WHERE title = :title
                  AND COALESCE(labor_price_per_m2, 0) = 0
                """
            ),
            {"labor_price_per_m2": labor_price_per_m2, "title": title},
        )


def downgrade() -> None:
    if _has_column("estimate_flooring_layouts", "labor_price_per_m2"):
        with op.batch_alter_table("estimate_flooring_layouts") as batch_op:
            batch_op.drop_column("labor_price_per_m2")
