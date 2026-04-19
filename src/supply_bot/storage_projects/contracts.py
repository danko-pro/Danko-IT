"""Persistence-операции по договору проекта и его milestones.

Модуль держит только contract-domain:
- get/upsert/delete contract;
- list/get/replace/update milestones.
"""

from __future__ import annotations

from typing import Any

PROJECT_CONTRACT_SELECT_SQL = """
SELECT
    id,
    project_id,
    file_name,
    title,
    number,
    signed_at,
    start_date,
    planned_end_date,
    amount,
    advance_terms,
    extraction_status,
    source_file_name,
    source_mime_type,
    source_storage_key,
    uploaded_at,
    created_at,
    updated_at
FROM project_contracts
"""

PROJECT_CONTRACT_MILESTONE_SELECT_SQL = """
SELECT
    id,
    contract_id,
    kind,
    title,
    planned_date,
    amount,
    note,
    status,
    sort_order,
    created_at,
    updated_at
FROM project_contract_milestones
"""


class ProjectContractsStorageMixin:
    # CRUD-операции по основной записи project contract.
    async def get_project_contract(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_CONTRACT_SELECT_SQL}
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def upsert_project_contract(
        self,
        *,
        project_id: int,
        file_name: str,
        title: str,
        number: str,
        signed_at: str,
        start_date: str,
        planned_end_date: str,
        amount: float,
        advance_terms: str,
        extraction_status: str,
        source_file_name: str | None = None,
        source_mime_type: str | None = None,
        source_storage_key: str | None = None,
        uploaded_at: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT id FROM project_contracts WHERE project_id = ?",
                (project_id,),
            )
            existing = await cursor.fetchone()
            if existing is None:
                cursor = await db.execute(
                    """
                    INSERT INTO project_contracts (
                        project_id,
                        file_name,
                        title,
                        number,
                        signed_at,
                        start_date,
                        planned_end_date,
                        amount,
                        advance_terms,
                        extraction_status,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        uploaded_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        project_id,
                        file_name,
                        title,
                        number,
                        signed_at,
                        start_date,
                        planned_end_date,
                        amount,
                        advance_terms,
                        extraction_status,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        uploaded_at,
                    ),
                )
                contract_id = int(cursor.lastrowid)
            else:
                contract_id = int(existing["id"])
                await db.execute(
                    """
                    UPDATE project_contracts
                    SET file_name = ?,
                        title = ?,
                        number = ?,
                        signed_at = ?,
                        start_date = ?,
                        planned_end_date = ?,
                        amount = ?,
                        advance_terms = ?,
                        extraction_status = ?,
                        source_file_name = COALESCE(?, source_file_name),
                        source_mime_type = COALESCE(?, source_mime_type),
                        source_storage_key = COALESCE(?, source_storage_key),
                        uploaded_at = COALESCE(?, uploaded_at),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE project_id = ?
                    """,
                    (
                        file_name,
                        title,
                        number,
                        signed_at,
                        start_date,
                        planned_end_date,
                        amount,
                        advance_terms,
                        extraction_status,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        uploaded_at,
                        project_id,
                    ),
                )
            await db.commit()
            return contract_id

    async def delete_project_contract(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_CONTRACT_SELECT_SQL}
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None

            payload = dict(row)
            await db.execute("DELETE FROM project_contracts WHERE project_id = ?", (project_id,))
            await db.commit()
            return payload

    # CRUD-операции по milestone-записям договора.
    async def list_project_contract_milestones(self, contract_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_CONTRACT_MILESTONE_SELECT_SQL}
                WHERE contract_id = ?
                ORDER BY sort_order, id
                """,
                (contract_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_project_contract_milestone(self, milestone_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_CONTRACT_MILESTONE_SELECT_SQL}
                WHERE id = ?
                """,
                (milestone_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def replace_project_contract_milestones(
        self,
        *,
        contract_id: int,
        milestones: list[dict[str, Any]],
    ) -> None:
        async with self.connection() as db:
            await db.execute("DELETE FROM project_contract_milestones WHERE contract_id = ?", (contract_id,))
            for index, milestone in enumerate(milestones, start=1):
                await db.execute(
                    """
                    INSERT INTO project_contract_milestones (
                        contract_id,
                        kind,
                        title,
                        planned_date,
                        amount,
                        note,
                        status,
                        sort_order
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        contract_id,
                        milestone["kind"],
                        milestone["title"],
                        milestone["planned_date"],
                        milestone["amount"],
                        milestone["note"],
                        milestone["status"],
                        milestone.get("sort_order", index * 10),
                    ),
                )
            await db.commit()

    async def update_project_contract_milestone(self, milestone_id: int, **updates: Any) -> bool:
        if not updates:
            return False

        columns: list[str] = []
        values: list[Any] = []
        for field, value in updates.items():
            columns.append(f"{field} = ?")
            values.append(value)

        values.append(milestone_id)
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                UPDATE project_contract_milestones
                SET {", ".join(columns)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                tuple(values),
            )
            await db.commit()
            return cursor.rowcount > 0
