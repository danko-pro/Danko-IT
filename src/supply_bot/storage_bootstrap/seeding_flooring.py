from __future__ import annotations

from supply_bot.storage_bootstrap.contracts import ConnectionFactory
from supply_bot.storage_bootstrap.defaults import (
    FLOORING_COVERING_DEFAULTS,
    FLOORING_LAYOUT_DEFAULTS,
    FLOORING_PREPARATION_DEFAULTS,
)
from supply_bot.storage_bootstrap.seed_helpers import insert_missing_title_rows

# Seed-данные для flooring-среза калькулятора.


async def ensure_estimate_flooring_defaults(connection_factory: ConnectionFactory) -> None:
    async with connection_factory() as db:
        await insert_missing_title_rows(
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
        await insert_missing_title_rows(
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
        await insert_missing_title_rows(
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


__all__ = ["ensure_estimate_flooring_defaults"]
