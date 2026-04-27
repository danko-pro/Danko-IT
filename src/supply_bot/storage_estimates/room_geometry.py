from __future__ import annotations

from typing import Any

# Persistence для геометрии комнат: стены, участки пола и проёмы.


class EstimateRoomGeometryStorageMixin:
    async def list_estimate_room_walls(self, room_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, room_id, length_m, sort_order
                FROM estimate_room_walls
                WHERE room_id = ?
                ORDER BY sort_order, id
                """,
                (room_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def list_estimate_room_floor_sections(self, room_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, room_id, length_m, width_m, sort_order
                FROM estimate_room_floor_sections
                WHERE room_id = ?
                ORDER BY sort_order, id
                """,
                (room_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def list_estimate_room_openings(self, room_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, room_id, opening_type, width_m, height_m, quantity, area_m2, note, sort_order
                FROM estimate_room_openings
                WHERE room_id = ?
                ORDER BY sort_order, id
                """,
                (room_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def replace_estimate_room_walls(self, room_id: int, lengths_m: list[float]) -> None:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM estimate_rooms WHERE id = ?",
                (room_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return
            project_id = int(row["project_id"])
            await db.execute("DELETE FROM estimate_room_walls WHERE room_id = ?", (room_id,))
            for index, length_m in enumerate(lengths_m, start=1):
                if length_m <= 0:
                    continue
                await db.execute(
                    """
                    INSERT INTO estimate_room_walls (room_id, length_m, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    (room_id, length_m, index * 10),
                )
            await db.execute(
                """
                UPDATE estimate_rooms
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (room_id,),
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

    async def replace_estimate_room_floor_sections(
        self,
        room_id: int,
        sections: list[dict[str, float]],
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
            await db.execute("DELETE FROM estimate_room_floor_sections WHERE room_id = ?", (room_id,))
            for index, section in enumerate(sections, start=1):
                length_m = float(section.get("length_m") or 0)
                width_m = float(section.get("width_m") or 0)
                if length_m <= 0 or width_m <= 0:
                    continue
                await db.execute(
                    """
                    INSERT INTO estimate_room_floor_sections (room_id, length_m, width_m, sort_order)
                    VALUES (?, ?, ?, ?)
                    """,
                    (room_id, length_m, width_m, index * 10),
                )
            await db.execute(
                """
                UPDATE estimate_rooms
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (room_id,),
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

    async def replace_estimate_room_openings(
        self,
        room_id: int,
        openings: list[dict[str, Any]],
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
            await db.execute("DELETE FROM estimate_room_openings WHERE room_id = ?", (room_id,))
            for index, opening in enumerate(openings, start=1):
                opening_type = str(opening.get("opening_type") or "window")
                width_m = opening.get("width_m")
                height_m = opening.get("height_m")
                quantity = opening.get("quantity")
                area_m2 = opening.get("area_m2")
                note = opening.get("note")
                width_value = max(0.0, float(width_m)) if width_m not in (None, "") else None
                height_value = max(0.0, float(height_m)) if height_m not in (None, "") else None
                quantity_value = max(0.0, float(quantity)) if quantity not in (None, "") else 1.0
                area_value = max(0.0, float(area_m2)) if area_m2 not in (None, "") else None
                if area_value is None and (width_value is None or height_value is None):
                    continue
                await db.execute(
                    """
                    INSERT INTO estimate_room_openings (
                        room_id, opening_type, width_m, height_m, quantity, area_m2, note, sort_order
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        room_id,
                        opening_type,
                        width_value,
                        height_value,
                        quantity_value,
                        area_value,
                        note,
                        index * 10,
                    ),
                )
            await db.execute(
                """
                UPDATE estimate_rooms
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (room_id,),
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
