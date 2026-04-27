"""CRUD-операции по самой сущности проекта.

Этот модуль отвечает только за project records:
- list/count/create/get/update/delete.
Авансы, ledger, contract и sync вынесены в отдельные mixin-модули.
"""

from __future__ import annotations

from typing import Any

PROJECT_SELECT_SQL = """
SELECT
    p.id,
    p.code,
    p.name,
    p.address,
    p.entrance_section,
    p.apartment,
    p.floor,
    p.room_count,
    p.has_elevator,
    p.site_access,
    p.access_hours,
    p.intercom_code,
    p.responsible_person,
    p.comment,
    p.stage_label,
    p.stage_tone,
    p.estimate_project_id,
    ep.name AS estimate_project_name,
    p.estimate_source,
    p.area_m2,
    p.ceiling_height_m,
    p.received_total,
    p.remaining_total,
    p.deferred_total,
    p.planned_total,
    p.actual_total,
    p.work_per_m2,
    p.materials_per_m2,
    p.planned_margin_percent,
    p.next_delivery_label,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN estimate_projects ep ON ep.id = p.estimate_project_id
"""


class ProjectRecordsStorageMixin:
    # Основные CRUD-операции проекта.
    async def list_projects(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_SELECT_SQL}
                ORDER BY p.updated_at DESC, p.id DESC
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def count_projects(self) -> int:
        async with self.connection() as db:
            cursor = await db.execute("SELECT COUNT(*) AS total FROM projects")
            row = await cursor.fetchone()
        return int(row["total"] if row is not None else 0)

    async def create_project(
        self,
        *,
        code: str,
        name: str,
        address: str,
        entrance_section: str,
        apartment: str,
        floor: str,
        room_count: int,
        has_elevator: bool,
        site_access: str,
        access_hours: str,
        intercom_code: str,
        responsible_person: str,
        comment: str,
        stage_label: str,
        stage_tone: str,
        estimate_project_id: int | None,
        estimate_source: str,
        area_m2: float,
        ceiling_height_m: float,
        received_total: float,
        remaining_total: float,
        deferred_total: float,
        planned_total: float,
        actual_total: float,
        work_per_m2: float,
        materials_per_m2: float,
        planned_margin_percent: float,
        next_delivery_label: str,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO projects (
                    code,
                    name,
                    address,
                    entrance_section,
                    apartment,
                    floor,
                    room_count,
                    has_elevator,
                    site_access,
                    access_hours,
                    intercom_code,
                    responsible_person,
                    comment,
                    stage_label,
                    stage_tone,
                    estimate_project_id,
                    estimate_source,
                    area_m2,
                    ceiling_height_m,
                    received_total,
                    remaining_total,
                    deferred_total,
                    planned_total,
                    actual_total,
                    work_per_m2,
                    materials_per_m2,
                    planned_margin_percent,
                    next_delivery_label
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    code,
                    name,
                    address,
                    entrance_section,
                    apartment,
                    floor,
                    room_count,
                    int(has_elevator),
                    site_access,
                    access_hours,
                    intercom_code,
                    responsible_person,
                    comment,
                    stage_label,
                    stage_tone,
                    estimate_project_id,
                    estimate_source,
                    area_m2,
                    ceiling_height_m,
                    received_total,
                    remaining_total,
                    deferred_total,
                    planned_total,
                    actual_total,
                    work_per_m2,
                    materials_per_m2,
                    planned_margin_percent,
                    next_delivery_label,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def get_project(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_SELECT_SQL}
                WHERE p.id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_project(self, project_id: int, **updates: Any) -> bool:
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
                UPDATE projects
                SET {", ".join(columns)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                tuple(values),
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_project(self, project_id: int) -> bool:
        async with self.connection() as db:
            cursor = await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            await db.commit()
            return cursor.rowcount > 0
