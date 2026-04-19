from __future__ import annotations

from typing import Any

# Persistence для каталогов покрытий, подготовок и схем отделки стен.


class EstimateWallFinishCatalogStorageMixin:
    # Каталог покрытий.
    async def list_estimate_wall_finish_coverings(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, material_price_per_m2, labor_price_per_m2, base_waste_percent,
                       glue_consumption_per_m2, glue_unit, glue_price_per_unit,
                       primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                       putty_consumption_per_m2, putty_unit, putty_price_per_unit,
                       mesh_consumption_per_m2, mesh_unit, mesh_price_per_unit,
                       instrument_price_per_m2,
                       note, is_active, created_at, updated_at
                FROM estimate_wall_finish_coverings
                WHERE is_active = 1
                ORDER BY title, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_wall_finish_covering(
        self,
        *,
        title: str,
        material_price_per_m2: float,
        labor_price_per_m2: float,
        base_waste_percent: float,
        glue_consumption_per_m2: float,
        glue_unit: str,
        glue_price_per_unit: float,
        primer_consumption_per_m2: float,
        primer_unit: str,
        primer_price_per_unit: float,
        putty_consumption_per_m2: float,
        putty_unit: str,
        putty_price_per_unit: float,
        mesh_consumption_per_m2: float,
        mesh_unit: str,
        mesh_price_per_unit: float,
        instrument_price_per_m2: float,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_wall_finish_coverings (
                    title, material_price_per_m2, labor_price_per_m2, base_waste_percent,
                    glue_consumption_per_m2, glue_unit, glue_price_per_unit,
                    primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                    putty_consumption_per_m2, putty_unit, putty_price_per_unit,
                    mesh_consumption_per_m2, mesh_unit, mesh_price_per_unit,
                    instrument_price_per_m2, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
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
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    # Каталог подготовок.
    async def list_estimate_wall_finish_preparations(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, labor_price_per_m2, material_price_per_m2,
                       primer_consumption_per_m2, primer_unit, primer_price_per_unit,
                       note, is_active, created_at, updated_at
                FROM estimate_wall_finish_preparations
                WHERE is_active = 1
                ORDER BY title, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_wall_finish_preparation(
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
                INSERT INTO estimate_wall_finish_preparations (
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

    # Каталог схем отделки.
    async def list_estimate_wall_finish_layouts(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, labor_multiplier, extra_waste_percent,
                       note, is_active, created_at, updated_at
                FROM estimate_wall_finish_layouts
                WHERE is_active = 1
                ORDER BY id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_wall_finish_layout(
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
                INSERT INTO estimate_wall_finish_layouts (
                    title, labor_multiplier, extra_waste_percent, note
                )
                VALUES (?, ?, ?, ?)
                """,
                (title, labor_multiplier, extra_waste_percent, note),
            )
            await db.commit()
            return int(cursor.lastrowid)
