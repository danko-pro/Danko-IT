from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.domain.finance import (
    ProjectLedgerFinanceInput,
    calculate_project_finance_summary,
)

FINANCE_SUMMARY_PAYLOAD_KEYS = (
    "received_total",
    "paid_expense_total",
    "planned_expense_total",
    "committed_unpaid_total",
    "cash_balance",
    "available_after_plan",
    "available_after_obligations",
    "tax_base",
    "tax_rate_percent",
    "tax_reserve_total",
    "net_available",
    "work_amount",
    "materials_amount",
    "work_per_m2",
    "materials_per_m2",
)


def build_project_finance_summary_payload(
    *,
    project: Mapping[str, Any],
    ledger_entries: list[Mapping[str, Any]],
) -> dict[str, Any]:
    entries = [
        ProjectLedgerFinanceInput(
            status=str(entry.get("status") or "planned"),
            category=str(entry.get("category") or ""),
            plan_amount=entry.get("plan_amount"),
            actual_amount=entry.get("actual_amount"),
        )
        for entry in ledger_entries
    ]
    summary = calculate_project_finance_summary(
        entries=entries,
        received_total=project.get("received_total", 0),
        area_m2=project.get("area_m2", 0),
        tax_rate_percent=0.0,
    )
    return {key: float(getattr(summary, key)) for key in FINANCE_SUMMARY_PAYLOAD_KEYS}
