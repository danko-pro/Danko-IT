from __future__ import annotations

from typing import Any

# Persistence для верхнего уровня estimate projects.


class EstimateProjectRecordsStorageMixin:
    async def list_estimate_projects(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT ep.id, ep.name, ep.residential_complex, ep.address, ep.entrance_section,
                       ep.apartment, ep.floor, ep.has_elevator, ep.lift_type, ep.site_access,
                       ep.intercom_code, ep.loading_zone, ep.responsible_person, ep.note,
                       ep.group_chat_id, ep.created_at, ep.updated_at,
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
                SELECT id, name, residential_complex, address, entrance_section, apartment,
                       floor, has_elevator, lift_type, site_access, intercom_code,
                       loading_zone, responsible_person, note, group_chat_id, created_at, updated_at
                FROM estimate_projects
                WHERE id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_estimate_project(self, project_id: int, **updates: Any) -> bool:
        if not updates:
            return False

        columns: list[str] = []
        values: list[Any] = []
        for field, value in updates.items():
            columns.append(f"{field} = ?")
            values.append(value)

        values.append(project_id)
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                UPDATE estimate_projects
                SET {", ".join(columns)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                tuple(values),
            )
            await db.commit()
            return cursor.rowcount > 0

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
