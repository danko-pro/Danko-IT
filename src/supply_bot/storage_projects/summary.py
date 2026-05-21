"""Project accounting summary-sync adapter."""

from __future__ import annotations

from datetime import date
from typing import Any

from supply_bot.projects.domain.finance import (
    ProjectLedgerFinanceInput,
    calculate_project_finance_summary,
)


def _legacy_amount(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _legacy_ledger_plan_balance_amount(*, status: str, plan_amount: float, actual_amount: float) -> float:
    if status == "planned":
        return plan_amount
    if plan_amount <= 0:
        return 0.0
    if actual_amount > 0:
        return plan_amount - actual_amount
    return plan_amount


class ProjectSummaryStorageMixin:
    async def _sync_project_summary_from_ledger(self, db: Any, *, project_id: int) -> None:
        cursor = await db.execute(
            """
            SELECT category, status, plan_amount, actual_amount, control_date
            FROM project_ledger_entries
            WHERE project_id = ?
            ORDER BY sort_order, id
            """,
            (project_id,),
        )
        rows = await cursor.fetchall()

        cursor = await db.execute(
            "SELECT area_m2, received_total FROM projects WHERE id = ?",
            (project_id,),
        )
        project_row = await cursor.fetchone()
        if project_row is None:
            return

        area_m2 = _legacy_amount(project_row["area_m2"])
        received_total = _legacy_amount(project_row["received_total"])
        entries = [
            ProjectLedgerFinanceInput(
                status=str(row["status"] or "planned"),
                category=str(row["category"] or ""),
                plan_amount=row["plan_amount"],
                actual_amount=row["actual_amount"],
            )
            for row in rows
        ]
        summary = calculate_project_finance_summary(
            entries=entries,
            received_total=received_total,
            area_m2=area_m2,
        )

        # planned_total is legacy API field and currently means remaining plan balance,
        # not total planned expenses. New planned_expense_total exists in finance engine
        # but is not exposed through API yet.
        legacy_planned_total = 0.0
        next_control_date: date | None = None

        for row in rows:
            status = str(row["status"] or "planned")
            legacy_planned_total += _legacy_ledger_plan_balance_amount(
                status=status,
                plan_amount=_legacy_amount(row["plan_amount"]),
                actual_amount=_legacy_amount(row["actual_amount"]),
            )

            control_date_raw = str(row["control_date"] or "")
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
                legacy_planned_total,
                summary.paid_expense_total,
                summary.cash_balance,
                summary.committed_unpaid_total,
                summary.work_per_m2,
                summary.materials_per_m2,
                next_delivery_label,
                project_id,
            ),
        )
