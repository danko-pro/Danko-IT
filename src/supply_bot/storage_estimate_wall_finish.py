from __future__ import annotations

from typing import Any


class EstimateWallFinishStorageMixin:
    async def get_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT project_id,
                       include_preparation,
                       include_demolition,
                       demolition_price_per_m2,
                       created_at,
                       updated_at
                FROM estimate_wall_finish_configs
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def ensure_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any]:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO estimate_wall_finish_configs (project_id)
                VALUES (?)
                """,
                (project_id,),
            )
            await db.commit()
        config = await self.get_estimate_wall_finish_config(project_id)
        return config or {"project_id": project_id}

    async def update_estimate_wall_finish_config(
        self,
        project_id: int,
        *,
        include_preparation: bool,
        include_demolition: bool,
        demolition_price_per_m2: float,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO estimate_wall_finish_configs (
                    project_id,
                    include_preparation,
                    include_demolition,
                    demolition_price_per_m2,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET
                    include_preparation = excluded.include_preparation,
                    include_demolition = excluded.include_demolition,
                    demolition_price_per_m2 = excluded.demolition_price_per_m2,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    1 if include_preparation else 0,
                    1 if include_demolition else 0,
                    demolition_price_per_m2,
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

    async def list_estimate_wall_finish_rooms(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT ewfr.id, ewfr.project_id, ewfr.room_id,
                       ewfr.covering_id, ewfr.preparation_id, ewfr.layout_id,
                       ewfr.area_m2_override, ewfr.note, ewfr.sort_order,
                       ewfr.created_at, ewfr.updated_at
                FROM estimate_wall_finish_rooms ewfr
                WHERE ewfr.project_id = ?
                ORDER BY ewfr.sort_order, ewfr.id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def replace_estimate_wall_finish_rooms(
        self,
        project_id: int,
        rooms: list[dict[str, Any]],
    ) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM estimate_wall_finish_rooms WHERE project_id = ?", (project_id,))
            for index, row in enumerate(rooms, start=1):
                await db.execute(
                    """
                    INSERT INTO estimate_wall_finish_rooms (
                        project_id,
                        room_id,
                        covering_id,
                        preparation_id,
                        layout_id,
                        area_m2_override,
                        note,
                        sort_order,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        project_id,
                        int(row["room_id"]),
                        row.get("covering_id"),
                        row.get("preparation_id"),
                        row.get("layout_id"),
                        float(row["area_m2_override"]) if row.get("area_m2_override") is not None else None,
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
