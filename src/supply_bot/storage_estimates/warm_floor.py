from __future__ import annotations

from typing import Any

# Persistence для конфигурации и выбора комнат тёплого пола.


class EstimateWarmFloorStorageMixin:
    async def get_estimate_warm_floor_config(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT project_id,
                       work_price_per_m2,
                       pipe_m_per_m2,
                       max_contour_area_m2,
                       small_zone_area_m2,
                       manifold_work_price,
                       manifold_material_price,
                       pump_work_price,
                       pump_material_price,
                       pipe_price_per_m,
                       pump_rooms_threshold,
                       pump_contours_threshold,
                       created_at,
                       updated_at
                FROM estimate_warm_floor_configs
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def ensure_estimate_warm_floor_config(self, project_id: int) -> dict[str, Any]:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO estimate_warm_floor_configs (project_id)
                VALUES (?)
                """,
                (project_id,),
            )
            await db.commit()
        config = await self.get_estimate_warm_floor_config(project_id)
        return config or {"project_id": project_id}

    async def update_estimate_warm_floor_config(
        self,
        project_id: int,
        *,
        work_price_per_m2: float,
        pipe_m_per_m2: float,
        max_contour_area_m2: float,
        small_zone_area_m2: float,
        manifold_work_price: float,
        manifold_material_price: float,
        pump_work_price: float,
        pump_material_price: float,
        pipe_price_per_m: float,
        pump_rooms_threshold: int,
        pump_contours_threshold: int,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO estimate_warm_floor_configs (
                    project_id,
                    work_price_per_m2,
                    pipe_m_per_m2,
                    max_contour_area_m2,
                    small_zone_area_m2,
                    manifold_work_price,
                    manifold_material_price,
                    pump_work_price,
                    pump_material_price,
                    pipe_price_per_m,
                    pump_rooms_threshold,
                    pump_contours_threshold,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET
                    work_price_per_m2 = excluded.work_price_per_m2,
                    pipe_m_per_m2 = excluded.pipe_m_per_m2,
                    max_contour_area_m2 = excluded.max_contour_area_m2,
                    small_zone_area_m2 = excluded.small_zone_area_m2,
                    manifold_work_price = excluded.manifold_work_price,
                    manifold_material_price = excluded.manifold_material_price,
                    pump_work_price = excluded.pump_work_price,
                    pump_material_price = excluded.pump_material_price,
                    pipe_price_per_m = excluded.pipe_price_per_m,
                    pump_rooms_threshold = excluded.pump_rooms_threshold,
                    pump_contours_threshold = excluded.pump_contours_threshold,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    work_price_per_m2,
                    pipe_m_per_m2,
                    max_contour_area_m2,
                    small_zone_area_m2,
                    manifold_work_price,
                    manifold_material_price,
                    pump_work_price,
                    pump_material_price,
                    pipe_price_per_m,
                    pump_rooms_threshold,
                    pump_contours_threshold,
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

    async def list_estimate_warm_floor_rooms(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, project_id, room_id, area_m2_override, note, sort_order, updated_at
                FROM estimate_warm_floor_rooms
                WHERE project_id = ?
                ORDER BY sort_order, id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def replace_estimate_warm_floor_rooms(
        self,
        project_id: int,
        rows: list[dict[str, Any]],
    ) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM estimate_warm_floor_rooms WHERE project_id = ?", (project_id,))
            for index, row in enumerate(rows, start=1):
                room_id = int(row["room_id"])
                area_m2_override = row.get("area_m2_override")
                note = row.get("note")
                await db.execute(
                    """
                    INSERT INTO estimate_warm_floor_rooms (
                        project_id,
                        room_id,
                        area_m2_override,
                        note,
                        sort_order,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                    (
                        project_id,
                        room_id,
                        float(area_m2_override) if area_m2_override is not None else None,
                        note,
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
