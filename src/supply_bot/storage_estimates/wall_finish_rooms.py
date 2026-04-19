from __future__ import annotations

from typing import Any

# Persistence для выбора комнат и overrides в расчёте отделки стен.


class EstimateWallFinishRoomsStorageMixin:
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
            await self._touch_estimate_project(db, project_id)
            await db.commit()
