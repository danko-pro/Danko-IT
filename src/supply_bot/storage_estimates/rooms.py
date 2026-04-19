from __future__ import annotations

from typing import Any

# Persistence для комнат калькулятора и их базовых полей.


class EstimateRoomRecordsStorageMixin:
    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, project_id, name, ceiling_height_m, manual_floor_area_m2,
                       auto_perimeter_calc, perimeter_factor, note,
                       sort_order, created_at, updated_at
                FROM estimate_rooms
                WHERE project_id = ?
                ORDER BY sort_order, id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_room(
        self,
        *,
        project_id: int,
        name: str,
        ceiling_height_m: float = 2.7,
        auto_perimeter_calc: bool = False,
        perimeter_factor: float = 1.15,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT COALESCE(MAX(sort_order), 0) FROM estimate_rooms WHERE project_id = ?",
                (project_id,),
            )
            row = await cursor.fetchone()
            sort_order = int(row[0] or 0) + 10
            cursor = await db.execute(
                """
                INSERT INTO estimate_rooms (
                    project_id, name, ceiling_height_m, auto_perimeter_calc, perimeter_factor, sort_order
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (project_id, name, ceiling_height_m, 1 if auto_perimeter_calc else 0, perimeter_factor, sort_order),
            )
            room_id = int(cursor.lastrowid)
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return room_id

    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, project_id, name, ceiling_height_m, manual_floor_area_m2,
                       auto_perimeter_calc, perimeter_factor, note,
                       sort_order, created_at, updated_at
                FROM estimate_rooms
                WHERE id = ?
                """,
                (room_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_estimate_room(
        self,
        room_id: int,
        *,
        name: str,
        ceiling_height_m: float,
        manual_floor_area_m2: float | None,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
        note: str | None,
    ) -> None:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM estimate_rooms WHERE id = ?",
                (room_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return
            project_id = int(row["project_id"])
            await db.execute(
                """
                UPDATE estimate_rooms
                SET name = ?,
                    ceiling_height_m = ?,
                    manual_floor_area_m2 = ?,
                    auto_perimeter_calc = ?,
                    perimeter_factor = ?,
                    note = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    name,
                    ceiling_height_m,
                    manual_floor_area_m2,
                    1 if auto_perimeter_calc else 0,
                    perimeter_factor,
                    note,
                    room_id,
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

    async def delete_estimate_room(self, room_id: int) -> None:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM estimate_rooms WHERE id = ?",
                (room_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return
            project_id = int(row["project_id"])
            await db.execute("DELETE FROM estimate_rooms WHERE id = ?", (room_id,))
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
