from __future__ import annotations

from supply_bot.storage_bootstrap.contracts import ConnectionFactory
from supply_bot.storage_bootstrap.defaults import (
    WALL_FINISH_COVERING_DEFAULTS,
    WALL_FINISH_LAYOUT_DEFAULTS,
    WALL_FINISH_PREPARATION_DEFAULTS,
)
from supply_bot.storage_bootstrap.seed_helpers import insert_missing_title_rows

# Seed-данные для wall finish-среза калькулятора.


async def ensure_estimate_wall_finish_defaults(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await insert_missing_title_rows(
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
        await insert_missing_title_rows(
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
        await insert_missing_title_rows(
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


__all__ = ["ensure_estimate_wall_finish_defaults"]
