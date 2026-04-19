"""Persistence-операции по ledger documents проекта.

Этот модуль отвечает только за document records, привязанные к ledger entry:
- list/get/upsert/update/delete.
"""

from __future__ import annotations

from typing import Any

PROJECT_LEDGER_DOCUMENT_SELECT_SQL = """
SELECT
    id,
    project_id,
    ledger_entry_id,
    kind,
    title,
    date,
    amount,
    source_file_name,
    source_mime_type,
    source_storage_key,
    extracted_by_ai,
    verified_by_user,
    uploaded_at,
    created_at,
    updated_at
FROM project_ledger_documents
"""


class ProjectLedgerDocumentsStorageMixin:
    # CRUD-операции только по ledger documents.
    async def list_project_ledger_documents(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_LEDGER_DOCUMENT_SELECT_SQL}
                WHERE project_id = ?
                ORDER BY ledger_entry_id, kind
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def get_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
    ) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_LEDGER_DOCUMENT_SELECT_SQL}
                WHERE ledger_entry_id = ? AND kind = ?
                """,
                (ledger_entry_id, kind),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def upsert_project_ledger_document(
        self,
        *,
        project_id: int,
        ledger_entry_id: int,
        kind: str,
        title: str,
        date: str,
        amount: float,
        source_file_name: str,
        source_mime_type: str,
        source_storage_key: str,
        extracted_by_ai: bool = False,
        verified_by_user: bool = False,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id
                FROM project_ledger_documents
                WHERE ledger_entry_id = ? AND kind = ?
                """,
                (ledger_entry_id, kind),
            )
            existing = await cursor.fetchone()
            if existing is None:
                cursor = await db.execute(
                    """
                    INSERT INTO project_ledger_documents (
                        project_id,
                        ledger_entry_id,
                        kind,
                        title,
                        date,
                        amount,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        extracted_by_ai,
                        verified_by_user
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        project_id,
                        ledger_entry_id,
                        kind,
                        title,
                        date,
                        amount,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        1 if extracted_by_ai else 0,
                        1 if verified_by_user else 0,
                    ),
                )
                document_id = int(cursor.lastrowid)
            else:
                document_id = int(existing["id"])
                await db.execute(
                    """
                    UPDATE project_ledger_documents
                    SET title = ?,
                        date = ?,
                        amount = ?,
                        source_file_name = ?,
                        source_mime_type = ?,
                        source_storage_key = ?,
                        extracted_by_ai = ?,
                        verified_by_user = ?,
                        uploaded_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (
                        title,
                        date,
                        amount,
                        source_file_name,
                        source_mime_type,
                        source_storage_key,
                        1 if extracted_by_ai else 0,
                        1 if verified_by_user else 0,
                        document_id,
                    ),
                )
            await db.commit()
            return document_id

    async def update_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
        **updates: Any,
    ) -> bool:
        if not updates:
            return False

        columns: list[str] = []
        values: list[Any] = []
        for field, value in updates.items():
            columns.append(f"{field} = ?")
            values.append(value)

        values.extend([ledger_entry_id, kind])
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                UPDATE project_ledger_documents
                SET {", ".join(columns)},
                    updated_at = CURRENT_TIMESTAMP
                WHERE ledger_entry_id = ? AND kind = ?
                """,
                tuple(values),
            )
            await db.commit()
            return cursor.rowcount > 0

    async def delete_project_ledger_document(
        self,
        *,
        ledger_entry_id: int,
        kind: str,
    ) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                f"""
                {PROJECT_LEDGER_DOCUMENT_SELECT_SQL}
                WHERE ledger_entry_id = ? AND kind = ?
                """,
                (ledger_entry_id, kind),
            )
            row = await cursor.fetchone()
            if row is None:
                return None

            payload = dict(row)
            await db.execute(
                "DELETE FROM project_ledger_documents WHERE ledger_entry_id = ? AND kind = ?",
                (ledger_entry_id, kind),
            )
            await db.commit()
            return payload
