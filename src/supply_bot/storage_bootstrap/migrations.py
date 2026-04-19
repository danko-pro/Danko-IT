from __future__ import annotations

import aiosqlite

from supply_bot.storage_bootstrap.contracts import ConnectionFactory

# Миграционные добивки поверх базовой SQL-схемы.


async def apply_storage_migrations(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await _ensure_column(
            db,
            table="estimate_rooms",
            column="auto_perimeter_calc",
            definition="INTEGER NOT NULL DEFAULT 0",
        )
        await _ensure_column(
            db,
            table="estimate_rooms",
            column="perimeter_factor",
            definition="REAL NOT NULL DEFAULT 1.15",
        )
        for table_name in ("estimate_door_catalog", "estimate_project_doors"):
            await _ensure_column(
                db,
                table=table_name,
                column="purchase_price",
                definition="REAL",
            )
            await _ensure_column(
                db,
                table=table_name,
                column="sale_price",
                definition="REAL",
            )
            await _ensure_column(
                db,
                table=table_name,
                column="install_price",
                definition="REAL",
            )
        for table_name in ("estimate_door_component_catalog", "estimate_project_door_components"):
            await _ensure_column(
                db,
                table=table_name,
                column="purchase_price",
                definition="REAL",
            )
            await _ensure_column(
                db,
                table=table_name,
                column="sale_price",
                definition="REAL",
            )
        await db.commit()


async def _ensure_column(
    db: aiosqlite.Connection,
    *,
    table: str,
    column: str,
    definition: str,
) -> None:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    rows = await cursor.fetchall()
    existing = {row["name"] for row in rows}
    if column in existing:
        return
    await db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


__all__ = ["apply_storage_migrations"]
