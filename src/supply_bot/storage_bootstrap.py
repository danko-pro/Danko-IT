from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

import aiosqlite

from supply_bot.storage_defaults import (
    FLOORING_COVERING_DEFAULTS,
    FLOORING_LAYOUT_DEFAULTS,
    FLOORING_PREPARATION_DEFAULTS,
    WALL_FINISH_COVERING_DEFAULTS,
    WALL_FINISH_LAYOUT_DEFAULTS,
    WALL_FINISH_PREPARATION_DEFAULTS,
)
from supply_bot.storage_schema import SCHEMA

ConnectionFactory = Callable[[], Any]


async def initialize_storage(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await db.executescript(SCHEMA)
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

    await _ensure_estimate_flooring_defaults(connection_factory)
    await _ensure_estimate_wall_finish_defaults(connection_factory)


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


async def _insert_missing_title_rows(
    db: aiosqlite.Connection,
    *,
    table: str,
    rows: Sequence[tuple[Any, ...]],
    insert_sql: str,
) -> None:
    cursor = await db.execute(f"SELECT title FROM {table}")
    existing_titles = {str(row["title"]) for row in await cursor.fetchall()}
    for row in rows:
        if str(row[0]) in existing_titles:
            continue
        await db.execute(insert_sql, row)


async def _ensure_estimate_flooring_defaults(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await _insert_missing_title_rows(
            db,
            table="estimate_flooring_coverings",
            rows=FLOORING_COVERING_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_flooring_coverings (
                    title,
                    material_price_per_m2,
                    labor_price_per_m2,
                    base_waste_percent,
                    underlay_mode,
                    underlay_consumption_per_m2,
                    glue_consumption_per_m2,
                    glue_unit,
                    glue_price_per_unit,
                    primer_consumption_per_m2,
                    primer_unit,
                    primer_price_per_unit,
                    svp_consumption_per_m2,
                    svp_unit,
                    svp_price_per_unit,
                    grout_consumption_per_m2,
                    grout_unit,
                    grout_price_per_unit,
                    needs_plinth,
                    instrument_price_per_m2,
                    note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        )
        await _insert_missing_title_rows(
            db,
            table="estimate_flooring_preparations",
            rows=FLOORING_PREPARATION_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_flooring_preparations (
                    title, labor_price_per_m2, material_price_per_m2,
                    primer_consumption_per_m2, primer_unit, primer_price_per_unit, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        )
        await _insert_missing_title_rows(
            db,
            table="estimate_flooring_layouts",
            rows=FLOORING_LAYOUT_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_flooring_layouts (
                    title, labor_multiplier, extra_waste_percent, note
                )
                VALUES (?, ?, ?, ?)
            """,
        )
        await db.commit()


async def _ensure_estimate_wall_finish_defaults(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await _insert_missing_title_rows(
            db,
            table="estimate_wall_finish_coverings",
            rows=WALL_FINISH_COVERING_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_wall_finish_coverings (
                    title,
                    material_price_per_m2,
                    labor_price_per_m2,
                    base_waste_percent,
                    glue_consumption_per_m2,
                    glue_unit,
                    glue_price_per_unit,
                    primer_consumption_per_m2,
                    primer_unit,
                    primer_price_per_unit,
                    putty_consumption_per_m2,
                    putty_unit,
                    putty_price_per_unit,
                    mesh_consumption_per_m2,
                    mesh_unit,
                    mesh_price_per_unit,
                    instrument_price_per_m2,
                    note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
        )
        await _insert_missing_title_rows(
            db,
            table="estimate_wall_finish_preparations",
            rows=WALL_FINISH_PREPARATION_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_wall_finish_preparations (
                    title, labor_price_per_m2, material_price_per_m2,
                    primer_consumption_per_m2, primer_unit, primer_price_per_unit, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        )
        await _insert_missing_title_rows(
            db,
            table="estimate_wall_finish_layouts",
            rows=WALL_FINISH_LAYOUT_DEFAULTS,
            insert_sql="""
                INSERT INTO estimate_wall_finish_layouts (
                    title, labor_multiplier, extra_waste_percent, note
                )
                VALUES (?, ?, ?, ?)
            """,
        )
        await db.commit()
