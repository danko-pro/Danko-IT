"""Persistence-операции по авансам проекта.

Модуль держит только advance flow:
- list/get/create/delete;
- пересчёт received/remaining totals после paid-аванса.
"""

from __future__ import annotations

from typing import Any

PROJECT_ADVANCE_SELECT_SQL = """
SELECT
    id,
    project_id,
    title,
    amount,
    date,
    status,
    created_at,
    updated_at
FROM project_advances
"""


class ProjectAdvancesStorageMixin:
    # CRUD-операции по project advances.
    async def list_project_advances(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_ADVANCE_SELECT_SQL}
                WHERE project_id = ?
                ORDER BY date DESC, id DESC
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_project_advance(self, advance_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_ADVANCE_SELECT_SQL}
                WHERE id = ?
                """,
                (advance_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def create_project_advance(
        self,
        *,
        project_id: int,
        title: str,
        amount: float,
        date: str,
        status: str,
        sync_totals: bool = True,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO project_advances (
                    project_id,
                    title,
                    amount,
                    date,
                    status
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (project_id, title, amount, date, status),
            )
            advance_id = int(cursor.lastrowid)
            if sync_totals and status == "paid":
                await self._update_project_received_totals(db, project_id=project_id, delta=amount)
            await db.commit()
            return advance_id

    async def delete_project_advance(self, advance_id: int, *, sync_totals: bool = True) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, project_id, amount, status
                FROM project_advances
                WHERE id = ?
                """,
                (advance_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None

            payload = dict(row)
            await db.execute("DELETE FROM project_advances WHERE id = ?", (advance_id,))
            if sync_totals and payload["status"] == "paid":
                await self._update_project_received_totals(
                    db,
                    project_id=int(payload["project_id"]),
                    delta=-float(payload["amount"] or 0),
                )
            await db.commit()
            return payload

    # Служебный helper только для paid advance-сценария.
    async def _update_project_received_totals(self, db: Any, *, project_id: int, delta: float) -> None:
        await db.execute(
            """
            UPDATE projects
            SET received_total = received_total + ?,
                remaining_total = remaining_total + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (delta, delta, project_id),
        )
