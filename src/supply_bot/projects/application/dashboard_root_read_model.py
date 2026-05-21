from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.application.finance_read_model import build_project_finance_summary_payload

DASHBOARD_ROOT_SUMMARY_KEYS = (
    "received_total",
    "paid_expense_total",
    "planned_expense_total",
    "committed_unpaid_total",
    "cash_balance",
    "available_after_plan",
    "available_after_obligations",
    "tax_reserve_total",
    "net_available",
)

RISK_NEGATIVE_NET_AVAILABLE = "negative_net_available"
RISK_OBLIGATION_PRESSURE = "obligation_pressure"
RISK_PLAN_PRESSURE = "plan_pressure"
RISK_TAX_PRESSURE = "tax_pressure"


def _safe_project_id(project: Mapping[str, Any]) -> int:
    value = project.get("id", project.get("project_id", 0))
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _empty_summary() -> dict[str, float]:
    return {key: 0.0 for key in DASHBOARD_ROOT_SUMMARY_KEYS}


def _build_risk_flags(finance_summary: Mapping[str, Any]) -> list[str]:
    flags: list[str] = []
    net_available = float(finance_summary["net_available"])
    available_after_obligations = float(finance_summary["available_after_obligations"])
    available_after_plan = float(finance_summary["available_after_plan"])
    tax_reserve_total = float(finance_summary["tax_reserve_total"])

    if net_available < 0:
        flags.append(RISK_NEGATIVE_NET_AVAILABLE)
    if available_after_obligations < 0:
        flags.append(RISK_OBLIGATION_PRESSURE)
    if available_after_plan < 0:
        flags.append(RISK_PLAN_PRESSURE)
    if tax_reserve_total > 0 and net_available < 0:
        flags.append(RISK_TAX_PRESSURE)
    return flags


def _build_risk_status(risk_flags: list[str]) -> str:
    if RISK_NEGATIVE_NET_AVAILABLE in risk_flags or RISK_OBLIGATION_PRESSURE in risk_flags:
        return "critical"
    if RISK_PLAN_PRESSURE in risk_flags or RISK_TAX_PRESSURE in risk_flags:
        return "warning"
    return "ok"


def build_dashboard_root_summary_payload(
    *,
    projects: list[Mapping[str, Any]],
    ledger_entries_by_project: Mapping[int, list[Mapping[str, Any]]],
) -> dict[str, Any]:
    summary = _empty_summary()
    project_rows: list[dict[str, Any]] = []

    for project in projects:
        project_id = _safe_project_id(project)
        finance_summary = build_project_finance_summary_payload(
            project=project,
            ledger_entries=ledger_entries_by_project.get(project_id, []),
        )
        for key in DASHBOARD_ROOT_SUMMARY_KEYS:
            summary[key] += float(finance_summary[key])

        risk_flags = _build_risk_flags(finance_summary)
        project_rows.append(
            {
                "project_id": project_id,
                "code": _safe_text(project.get("code")),
                "name": _safe_text(project.get("name")),
                "stage_label": _safe_text(project.get("stage_label")),
                "finance_summary": finance_summary,
                "risk_status": _build_risk_status(risk_flags),
                "risk_flags": risk_flags,
            }
        )

    return {
        "summary": summary,
        "projects": project_rows,
    }
