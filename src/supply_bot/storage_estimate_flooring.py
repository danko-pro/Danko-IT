from __future__ import annotations

from typing import Any


class EstimateFlooringStorageMixin:
    async def get_estimate_flooring_config(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT project_id,
                       include_underlay,
                       include_plinth,
                       include_demolition,
                       include_preparation,
                       demolition_price_per_m2,
                       underlay_price_per_m2,
                       plinth_material_price_per_m,
                       plinth_install_price_per_m,
                       threshold_profile_count,
                       threshold_profile_price,
                       created_at,
                       updated_at
                FROM estimate_flooring_configs
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def ensure_estimate_flooring_config(self, project_id: int) -> dict[str, Any]:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO estimate_flooring_configs (project_id)
                VALUES (?)
                """,
                (project_id,),
            )
            await db.commit()
        config = await self.get_estimate_flooring_config(project_id)
        return config or {"project_id": project_id}

    async def update_estimate_flooring_config(
        self,
        project_id: int,
        *,
        include_underlay: bool,
        include_plinth: bool,
        include_demolition: bool,
        include_preparation: bool,
        demolition_price_per_m2: float,
        underlay_price_per_m2: float,
        plinth_material_price_per_m: float,
        plinth_install_price_per_m: float,
        threshold_profile_count: int,
        threshold_profile_price: float,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO estimate_flooring_configs (
                    project_id,
                    include_underlay,
                    include_plinth,
                    include_demolition,
                    include_preparation,
                    demolition_price_per_m2,
                    underlay_price_per_m2,
                    plinth_material_price_per_m,
                    plinth_install_price_per_m,
                    threshold_profile_count,
                    threshold_profile_price,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET
                    include_underlay = excluded.include_underlay,
                    include_plinth = excluded.include_plinth,
                    include_demolition = excluded.include_demolition,
                    include_preparation = excluded.include_preparation,
                    demolition_price_per_m2 = excluded.demolition_price_per_m2,
                    underlay_price_per_m2 = excluded.underlay_price_per_m2,
                    plinth_material_price_per_m = excluded.plinth_material_price_per_m,
                    plinth_install_price_per_m = excluded.plinth_install_price_per_m,
                    threshold_profile_count = excluded.threshold_profile_count,
                    threshold_profile_price = excluded.threshold_profile_price,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    1 if include_underlay else 0,
                    1 if include_plinth else 0,
                    1 if include_demolition else 0,
                    1 if include_preparation else 0,
                    demolition_price_per_m2,
                    underlay_price_per_m2,
                    plinth_material_price_per_m,
                    plinth_install_price_per_m,
                    threshold_profile_count,
                    threshold_profile_price,
                ),
            )
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()

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

    async def list_estimate_flooring_rooms(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT efr.id, efr.project_id, efr.room_id,
                       efr.covering_id, efr.preparation_id, efr.layout_id,
                       efr.area_m2_override, efr.perimeter_m_override, efr.plinth_m_override,
                       efr.note, efr.sort_order, efr.created_at, efr.updated_at
                FROM estimate_flooring_rooms efr
                WHERE efr.project_id = ?
                ORDER BY efr.sort_order, efr.id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def replace_estimate_flooring_rooms(
        self,
        project_id: int,
        rooms: list[dict[str, Any]],
    ) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM estimate_flooring_rooms WHERE project_id = ?", (project_id,))
            for index, row in enumerate(rooms, start=1):
                await db.execute(
                    """
                    INSERT INTO estimate_flooring_rooms (
                        project_id,
                        room_id,
                        covering_id,
                        preparation_id,
                        layout_id,
                        area_m2_override,
                        perimeter_m_override,
                        plinth_m_override,
                        note,
                        sort_order,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        project_id,
                        int(row["room_id"]),
                        row.get("covering_id"),
                        row.get("preparation_id"),
                        row.get("layout_id"),
                        float(row["area_m2_override"]) if row.get("area_m2_override") is not None else None,
                        float(row["perimeter_m_override"]) if row.get("perimeter_m_override") is not None else None,
                        float(row["plinth_m_override"]) if row.get("plinth_m_override") is not None else None,
                        row.get("note"),
                        index * 10,
                    ),
                )
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
