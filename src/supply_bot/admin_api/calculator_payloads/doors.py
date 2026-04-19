from __future__ import annotations

from supply_bot.storage import BotStorage


async def _estimate_project_doors(storage: BotStorage, project_id: int) -> tuple[dict[int, float], int]:
    areas_by_room: dict[int, float] = {}
    doors_count = 0
    async with storage.connection() as db:
        cursor = await db.execute(
            """
            SELECT
                room_a_id,
                room_b_id,
                opening_kind,
                COALESCE(
                    area_m2,
                    CASE
                        WHEN width_mm IS NOT NULL AND height_mm IS NOT NULL
                        THEN (width_mm / 1000.0) * (height_mm / 1000.0)
                        ELSE 0
                    END
                ) AS calculated_area
            FROM estimate_project_doors
            WHERE project_id = ?
            """,
            (project_id,),
        )
        rows = await cursor.fetchall()
    for row in rows:
        area = float(row["calculated_area"] or 0)
        room_a_id = row["room_a_id"]
        room_b_id = row["room_b_id"]
        if row["opening_kind"] == "door":
            doors_count += 1
        if room_a_id is not None:
            areas_by_room[int(room_a_id)] = areas_by_room.get(int(room_a_id), 0.0) + area
        if room_b_id is not None:
            areas_by_room[int(room_b_id)] = areas_by_room.get(int(room_b_id), 0.0) + area
    return areas_by_room, doors_count
