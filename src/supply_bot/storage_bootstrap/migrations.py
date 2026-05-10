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
        await _ensure_column(
            db,
            table="estimate_flooring_configs",
            column="default_preparation_id",
            definition="INTEGER REFERENCES estimate_flooring_preparations(id) ON DELETE SET NULL",
        )
        await _ensure_column(
            db,
            table="estimate_flooring_configs",
            column="global_items_json",
            definition="TEXT NOT NULL DEFAULT ''",
        )
        await _ensure_column(
            db,
            table="estimate_flooring_coverings",
            column="custom_consumables_json",
            definition="TEXT NOT NULL DEFAULT ''",
        )
        await _ensure_column(
            db,
            table="estimate_wall_finish_coverings",
            column="custom_consumables_json",
            definition="TEXT NOT NULL DEFAULT ''",
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS estimate_flooring_room_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
                room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
                covering_id INTEGER REFERENCES estimate_flooring_coverings(id) ON DELETE SET NULL,
                preparation_id INTEGER REFERENCES estimate_flooring_preparations(id) ON DELETE SET NULL,
                layout_id INTEGER REFERENCES estimate_flooring_layouts(id) ON DELETE SET NULL,
                area_m2 REAL,
                note TEXT,
                sort_order INTEGER NOT NULL DEFAULT 100,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS estimate_wall_finish_room_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
                room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
                covering_id INTEGER REFERENCES estimate_wall_finish_coverings(id) ON DELETE SET NULL,
                preparation_id INTEGER REFERENCES estimate_wall_finish_preparations(id) ON DELETE SET NULL,
                layout_id INTEGER REFERENCES estimate_wall_finish_layouts(id) ON DELETE SET NULL,
                area_m2 REAL,
                note TEXT,
                sort_order INTEGER NOT NULL DEFAULT 100,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
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
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS request_draft_participants (
                draft_id INTEGER NOT NULL REFERENCES request_drafts(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL,
                user_name TEXT,
                role TEXT NOT NULL DEFAULT 'participant',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (draft_id, user_id)
            )
            """
        )
        await db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_request_draft_participants_user
            ON request_draft_participants(user_id, draft_id)
            """
        )
        await db.execute(
            """
            INSERT OR IGNORE INTO request_draft_participants (draft_id, user_id, user_name, role)
            SELECT id, master_id, master_name, 'owner'
            FROM request_drafts
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS telegram_notification_outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                sent_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        await db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_telegram_notification_outbox_pending
            ON telegram_notification_outbox(status, next_attempt_at, id)
            """
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
