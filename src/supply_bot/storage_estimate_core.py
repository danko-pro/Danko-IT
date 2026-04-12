from __future__ import annotations

from typing import Any


class EstimateCoreStorageMixin:
    async def list_estimate_projects(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT ep.id, ep.name, ep.note, ep.group_chat_id, ep.created_at, ep.updated_at,
                       COUNT(er.id) AS rooms_count
                FROM estimate_projects ep
                LEFT JOIN estimate_rooms er ON er.project_id = ep.id
                GROUP BY ep.id
                ORDER BY ep.updated_at DESC, ep.id DESC
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_project(
        self,
        *,
        name: str,
        note: str | None = None,
        group_chat_id: int | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_projects (name, note, group_chat_id)
                VALUES (?, ?, ?)
                """,
                (name, note, group_chat_id),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, name, note, group_chat_id, created_at, updated_at
                FROM estimate_projects
                WHERE id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def touch_estimate_project(self, project_id: int) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()

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
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
                SELECT id,
                       project_id,
                       room_id,
                       area_m2_override,
                       note,
                       sort_order,
                       created_at,
                       updated_at
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
        rooms: list[dict[str, Any]],
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                "DELETE FROM estimate_warm_floor_rooms WHERE project_id = ?",
                (project_id,),
            )
            for index, room in enumerate(rooms, start=1):
                room_id = int(room["room_id"])
                area_m2_override = room.get("area_m2_override")
                note = room.get("note")
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
                width_value = float(width_m) if width_m not in (None, "") else None
                height_value = float(height_m) if height_m not in (None, "") else None
                quantity_value = float(quantity) if quantity not in (None, "") else 1.0
                area_value = float(area_m2) if area_m2 not in (None, "") else None
                if area_value is None and (width_value is None or height_value is None):
                    continue
                if quantity_value <= 0:
                    quantity_value = 1.0
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
