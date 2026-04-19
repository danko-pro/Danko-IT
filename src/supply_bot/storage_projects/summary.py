"""Служебный summary-sync для project accounting.

Модуль отвечает только за пересчёт агрегированных project totals на основе ledger.
"""

from __future__ import annotations

from datetime import date
from typing import Any


class ProjectSummaryStorageMixin:
    # Пересчёт summary-полей проекта после мутаций ledger.
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
