from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.domain.finance import (
    ProjectLedgerFinanceInput,
    calculate_project_finance_summary,
)
from supply_bot.projects.application.tax_read_model import (
    build_project_tax_runtime_config,
    resolve_project_tax_base,
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
    tax_config = build_project_tax_runtime_config(project)
    tax_base = resolve_project_tax_base(
        project=project,
        tax_base_mode=tax_config.tax_base_mode,
    )
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
        tax_rate_percent=tax_config.tax_rate_percent,
        tax_base=tax_base,
    )
    return {key: float(getattr(summary, key)) for key in FINANCE_SUMMARY_PAYLOAD_KEYS}
