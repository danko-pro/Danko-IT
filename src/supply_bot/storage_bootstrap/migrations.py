from __future__ import annotations

import aiosqlite

from supply_bot.storage_bootstrap.contracts import ConnectionFactory

# Миграционные добивки поверх базовой SQL-схемы.


async def apply_storage_migrations(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        for column, definition in (
            ("residential_complex", "TEXT NOT NULL DEFAULT ''"),
            ("address", "TEXT NOT NULL DEFAULT ''"),
            ("entrance_section", "TEXT NOT NULL DEFAULT ''"),
            ("apartment", "TEXT NOT NULL DEFAULT ''"),
            ("floor", "TEXT NOT NULL DEFAULT ''"),
            ("has_elevator", "INTEGER NOT NULL DEFAULT 0"),
            ("lift_type", "TEXT NOT NULL DEFAULT ''"),
            ("site_access", "TEXT NOT NULL DEFAULT ''"),
            ("intercom_code", "TEXT NOT NULL DEFAULT ''"),
            ("loading_zone", "TEXT NOT NULL DEFAULT ''"),
            ("responsible_person", "TEXT NOT NULL DEFAULT ''"),
        ):
            await _ensure_column(
                db,
                table="estimate_projects",
                column=column,
                definition=definition,
            )
        for column, definition in (
            ("address", "TEXT NOT NULL DEFAULT ''"),
            ("entrance_section", "TEXT NOT NULL DEFAULT ''"),
            ("apartment", "TEXT NOT NULL DEFAULT ''"),
            ("floor", "TEXT NOT NULL DEFAULT ''"),
            ("room_count", "INTEGER NOT NULL DEFAULT 0"),
            ("has_elevator", "INTEGER NOT NULL DEFAULT 0"),
            ("site_access", "TEXT NOT NULL DEFAULT ''"),
            ("access_hours", "TEXT NOT NULL DEFAULT ''"),
            ("intercom_code", "TEXT NOT NULL DEFAULT ''"),
            ("responsible_person", "TEXT NOT NULL DEFAULT ''"),
            ("comment", "TEXT NOT NULL DEFAULT ''"),
            ("ceiling_height_m", "REAL NOT NULL DEFAULT 0"),
        ):
            await _ensure_column(
                db,
                table="projects",
                column=column,
                definition=definition,
            )
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
        for column, definition in (
            ("pipe_material_title", "TEXT NOT NULL DEFAULT 'Труба PEX-a 16x2 для водяного тёплого пола'"),
            ("manifold_material_items_json", "TEXT NOT NULL DEFAULT ''"),
            ("pump_material_items_json", "TEXT NOT NULL DEFAULT ''"),
            ("consumable_material_items_json", "TEXT NOT NULL DEFAULT ''"),
        ):
            await _ensure_column(
                db,
                table="estimate_warm_floor_configs",
                column=column,
                definition=definition,
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
