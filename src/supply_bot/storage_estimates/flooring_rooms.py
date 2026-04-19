from __future__ import annotations

from typing import Any

# Persistence для выбора комнат и overrides в расчёте напольных покрытий.


class EstimateFlooringRoomsStorageMixin:
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
            await self._touch_estimate_project(db, project_id)
            await db.commit()
