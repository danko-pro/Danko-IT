"""Persistence-операции по ledger entries проекта.

Этот модуль отвечает за сами строки ledger:
- list/get/create/update/delete;
- триггер summary sync после изменений.
"""

from __future__ import annotations

from typing import Any

PROJECT_LEDGER_ENTRY_SELECT_SQL = """
SELECT
    id,
    project_id,
    category,
    item,
    owner,
    counterparty,
    counterparty_inn,
    counterparty_legal_name,
    counterparty_manager_name,
    counterparty_email,
    counterparty_phone,
    counterparty_messenger,
    status,
    plan_amount,
    actual_amount,
    control_date,
    sort_order,
    created_at,
    updated_at
FROM project_ledger_entries
"""


class ProjectLedgerEntriesStorageMixin:
    # CRUD-операции только по строкам project ledger.
    async def list_project_ledger_entries(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_LEDGER_ENTRY_SELECT_SQL}
                WHERE project_id = ?
                ORDER BY sort_order, id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_project_ledger_entry(self, entry_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_LEDGER_ENTRY_SELECT_SQL}
                WHERE id = ?
                """,
                (entry_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def create_project_ledger_entry(
        self,
        *,
        project_id: int,
        category: str,
        item: str,
        owner: str,
        counterparty: str,
        counterparty_inn: str | None,
        counterparty_legal_name: str | None,
        counterparty_manager_name: str | None,
        counterparty_email: str | None,
        counterparty_phone: str | None,
        counterparty_messenger: str | None,
        status: str,
        plan_amount: float,
        actual_amount: float,
        control_date: str,
        sync_summary: bool = True,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order
                FROM project_ledger_entries
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
            sort_order = int((row["max_sort_order"] if row else 0) or 0) + 10
            cursor = await db.execute(
                """
                INSERT INTO project_ledger_entries (
                    project_id,
                    category,
                    item,
                    owner,
                    counterparty,
                    counterparty_inn,
                    counterparty_legal_name,
                    counterparty_manager_name,
                    counterparty_email,
                    counterparty_phone,
                    counterparty_messenger,
                    status,
                    plan_amount,
                    actual_amount,
                    control_date,
                    sort_order
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    category,
                    item,
                    owner,
                    counterparty,
                    counterparty_inn,
                    counterparty_legal_name,
                    counterparty_manager_name,
                    counterparty_email,
                    counterparty_phone,
                    counterparty_messenger,
                    status,
                    plan_amount,
                    actual_amount,
                    control_date,
                    sort_order,
                ),
            )
            entry_id = int(cursor.lastrowid)
            if sync_summary:
                await self._sync_project_summary_from_ledger(db, project_id=project_id)
            await db.commit()
            return entry_id

    async def update_project_ledger_entry(self, entry_id: int, *, sync_summary: bool = True, **updates: Any) -> bool:
        if not updates:
            return False

        columns: list[str] = []
        values: list[Any] = []
        for field, value in updates.items():
            columns.append(f"{field} = ?")
            values.append(value)

        values.append(entry_id)
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM project_ledger_entries WHERE id = ?",
                (entry_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return False
            project_id = int(row["project_id"])

            cursor = await db.execute(
                f"""
                UPDATE project_ledger_entries
                SET {", ".join(columns)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                tuple(values),
            )
            if sync_summary:
                await self._sync_project_summary_from_ledger(db, project_id=project_id)
            await db.commit()
            return cursor.rowcount > 0

    async def delete_project_ledger_entry(self, entry_id: int, *, sync_summary: bool = True) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, project_id
                FROM project_ledger_entries
                WHERE id = ?
                """,
                (entry_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None

            payload = dict(row)
            await db.execute("DELETE FROM project_ledger_entries WHERE id = ?", (entry_id,))
            if sync_summary:
                await self._sync_project_summary_from_ledger(db, project_id=int(payload["project_id"]))
            await db.commit()
            return payload
