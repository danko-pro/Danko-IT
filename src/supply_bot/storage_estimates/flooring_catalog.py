from __future__ import annotations

from typing import Any

# Persistence для каталогов напольных покрытий, подготовок и схем укладки.


class EstimateFlooringCatalogStorageMixin:
    # Каталог покрытий.
    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, material_price_per_m2, labor_price_per_m2, base_waste_percent,
                       underlay_mode, underlay_consumption_per_m2,
                       glue_consumption_per_m2, glue_unit, glue_price_per_unit,
                       primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                       svp_consumption_per_m2, svp_unit, svp_price_per_unit,
                       grout_consumption_per_m2, grout_unit, grout_price_per_unit,
                       needs_plinth, instrument_price_per_m2,
                       note, is_active, created_at, updated_at
                FROM estimate_flooring_coverings
                WHERE is_active = 1
                ORDER BY title, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_flooring_covering(
        self,
        *,
        title: str,
        material_price_per_m2: float,
        labor_price_per_m2: float,
        base_waste_percent: float,
        underlay_mode: str,
        underlay_consumption_per_m2: float,
        glue_consumption_per_m2: float,
        glue_unit: str,
        glue_price_per_unit: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        svp_consumption_per_m2: float,
        svp_unit: str,
        svp_price_per_unit: float,
        grout_consumption_per_m2: float,
        grout_unit: str,
        grout_price_per_unit: float,
        needs_plinth: bool,
        instrument_price_per_m2: float,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_flooring_coverings (
                    title, material_price_per_m2, labor_price_per_m2, base_waste_percent,
                    underlay_mode, underlay_consumption_per_m2,
                    glue_consumption_per_m2, glue_unit, glue_price_per_unit,
                    primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                    svp_consumption_per_m2, svp_unit, svp_price_per_unit,
                    grout_consumption_per_m2, grout_unit, grout_price_per_unit,
                    needs_plinth, instrument_price_per_m2, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
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
                    1 if needs_plinth else 0,
                    instrument_price_per_m2,
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    # Каталог подготовок.
    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, labor_price_per_m2, material_price_per_m2,
                       primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                       note, is_active, created_at, updated_at
                FROM estimate_flooring_preparations
                WHERE is_active = 1
                ORDER BY title, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_flooring_preparation(
        self,
        *,
        title: str,
        labor_price_per_m2: float,
        material_price_per_m2: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_flooring_preparations (
                    title, labor_price_per_m2, material_price_per_m2,
                    primer_consumption_per_m2, primer_unit, primer_price_per_unit, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    labor_price_per_m2,
                    material_price_per_m2,
                    primer_consumption_per_m2,
                    primer_unit,
                    primer_price_per_unit,
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    # Каталог схем укладки.
    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, labor_multiplier, extra_waste_percent,
                       note, is_active, created_at, updated_at
                FROM estimate_flooring_layouts
                WHERE is_active = 1
                ORDER BY id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_flooring_layout(
        self,
        *,
        title: str,
        labor_multiplier: float,
        extra_waste_percent: float,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_flooring_layouts (
                    title, labor_multiplier, extra_waste_percent, note
                )
                VALUES (?, ?, ?, ?)
                """,
                (title, labor_multiplier, extra_waste_percent, note),
            )
            await db.commit()
            return int(cursor.lastrowid)
