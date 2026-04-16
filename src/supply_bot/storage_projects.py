from __future__ import annotations

from datetime import date
from typing import Any


class ProjectsStorageMixin:
    async def list_projects(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT
                    p.id,
                    p.code,
                    p.name,
                    p.stage_label,
                    p.stage_tone,
                    p.estimate_project_id,
                    ep.name AS estimate_project_name,
                    p.estimate_source,
                    p.area_m2,
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
        stage_label: str,
        stage_tone: str,
        estimate_project_id: int | None,
        estimate_source: str,
        area_m2: float,
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
                    stage_label,
                    stage_tone,
                    estimate_project_id,
                    estimate_source,
                    area_m2,
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    code,
                    name,
                    stage_label,
                    stage_tone,
                    estimate_project_id,
                    estimate_source,
                    area_m2,
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
                """
                SELECT
                    p.id,
                    p.code,
                    p.name,
                    p.stage_label,
                    p.stage_tone,
                    p.estimate_project_id,
                    ep.name AS estimate_project_name,
                    p.estimate_source,
                    p.area_m2,
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

    async def list_project_advances(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
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
                """
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

    async def list_project_ledger_entries(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
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
                """
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
                "SELECT COALESCE(MAX(sort_order), 0) AS max_sort_order FROM project_ledger_entries WHERE project_id = ?",
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

    async def list_project_ledger_documents(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
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
                """
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
                """
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

    async def get_project_contract(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
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
                """
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

    async def list_project_contract_milestones(self, contract_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
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
                """
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

    async def _sync_project_summary_from_ledger(self, db: Any, *, project_id: int) -> None:
        cursor = await db.execute(
            """
            SELECT category, plan_amount, actual_amount, control_date
            FROM project_ledger_entries
            WHERE project_id = ?
            ORDER BY sort_order, id
            """,
            (project_id,),
        )
        rows = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT area_m2, received_total, deferred_total FROM projects WHERE id = ?",
            (project_id,),
        )
        project_row = await cursor.fetchone()
        if project_row is None:
            return

        area_m2 = float(project_row["area_m2"] or 0)
        received_total = float(project_row["received_total"] or 0)
        deferred_total = float(project_row["deferred_total"] or 0)

        planned_total = 0.0
        actual_total = 0.0
        work_amount = 0.0
        materials_amount = 0.0
        next_control_date: date | None = None

        for row in rows:
            plan_amount = float(row["plan_amount"] or 0)
            actual_amount = float(row["actual_amount"] or 0)
            effective_amount = actual_amount if actual_amount > 0 else plan_amount
            category = str(row["category"] or "")
            control_date_raw = str(row["control_date"] or "")

            planned_total += plan_amount
            actual_total += actual_amount
            if category == "Работы":
                work_amount += effective_amount
            if category == "Материалы":
                materials_amount += effective_amount

            if control_date_raw:
                try:
                    parsed_date = date.fromisoformat(control_date_raw)
                except ValueError:
                    parsed_date = None
                if parsed_date is not None and (next_control_date is None or parsed_date < next_control_date):
                    next_control_date = parsed_date

        next_delivery_label = next_control_date.strftime("%d.%m") if next_control_date else ""

        await db.execute(
            """
            UPDATE projects
            SET planned_total = ?,
                actual_total = ?,
                remaining_total = ?,
                deferred_total = ?,
                work_per_m2 = ?,
                materials_per_m2 = ?,
                next_delivery_label = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                planned_total,
                actual_total,
                received_total - actual_total,
                deferred_total,
                work_amount / area_m2 if area_m2 > 0 else 0,
                materials_amount / area_m2 if area_m2 > 0 else 0,
                next_delivery_label,
                project_id,
            ),
        )
