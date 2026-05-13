from __future__ import annotations

from typing import Any


async def _estimate_project_doors(storage: Any, project_id: int) -> tuple[dict[int, float], int]:
    areas_by_room: dict[int, float] = {}
    doors_count = 0
    rows = await storage.list_estimate_project_doors(project_id)
    for row in rows:
        area = float(row["area_m2"] or 0)
        room_a_id = row["room_a_id"]
        room_b_id = row["room_b_id"]
        if row["opening_kind"] == "door":
            doors_count += 1
        if room_a_id is not None:
            areas_by_room[int(room_a_id)] = areas_by_room.get(int(room_a_id), 0.0) + area
        if room_b_id is not None:
            areas_by_room[int(room_b_id)] = areas_by_room.get(int(room_b_id), 0.0) + area
    return areas_by_room, doors_count
