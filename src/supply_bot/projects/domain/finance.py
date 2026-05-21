"""Pure project finance calculations for dashboard summaries."""

from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

_PLANNED_STATUS = "planned"
_COMMITTED_UNPAID_STATUSES = {"invoice", "waiting-payment"}
_PAID_STATUSES = {"paid", "completed"}
_KNOWN_STATUSES = {_PLANNED_STATUS, *_COMMITTED_UNPAID_STATUSES, *_PAID_STATUSES}


@dataclass(frozen=True)
class ProjectLedgerFinanceInput:
    status: str
    category: str
    plan_amount: float | int | str | None = 0.0
    actual_amount: float | int | str | None = 0.0


@dataclass(frozen=True)
class ProjectLedgerEntryAmounts:
    paid_amount: float
    planned_amount: float
    committed_unpaid_amount: float
    committed_amount: float
    work_amount: float
    materials_amount: float


@dataclass(frozen=True)
class ProjectFinanceSummary:
    received_total: float
    paid_expense_total: float
    planned_expense_total: float
    committed_unpaid_total: float
    cash_balance: float
    available_after_plan: float
    available_after_obligations: float
    tax_base: float
    tax_rate_percent: float
    tax_reserve_total: float
    net_available: float
    work_amount: float
    materials_amount: float
    work_per_m2: float
    materials_per_m2: float


def _safe_amount(value: float | int | str | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return 0.0
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not isfinite(amount) or amount < 0:
        return 0.0
    return amount


def _normalize_status(status: str) -> str:
    normalized = (status or "").strip().lower()
    if normalized in _KNOWN_STATUSES:
        return normalized
    return _PLANNED_STATUS


def calculate_ledger_entry_amounts(entry: ProjectLedgerFinanceInput) -> ProjectLedgerEntryAmounts:
    status = _normalize_status(entry.status)
    plan_amount = _safe_amount(entry.plan_amount)
    actual_amount = _safe_amount(entry.actual_amount)

    paid_amount = 0.0
    planned_amount = 0.0
    committed_unpaid_amount = 0.0

    if status == _PLANNED_STATUS:
        planned_amount = plan_amount
        committed_amount = plan_amount
    elif status in _COMMITTED_UNPAID_STATUSES:
        committed_unpaid_amount = actual_amount if actual_amount > 0 else plan_amount
        committed_amount = committed_unpaid_amount
    else:
        paid_amount = actual_amount if actual_amount > 0 else plan_amount
        committed_amount = paid_amount

    category = (entry.category or "").strip()
    work_amount = 0.0
    materials_amount = 0.0
    # TODO: replace exact Russian label checks with a stable category type.
    if category == "Работы":
        work_amount = committed_amount
    if category == "Материалы":
        materials_amount = committed_amount

    return ProjectLedgerEntryAmounts(
        paid_amount=paid_amount,
        planned_amount=planned_amount,
        committed_unpaid_amount=committed_unpaid_amount,
        committed_amount=committed_amount,
        work_amount=work_amount,
        materials_amount=materials_amount,
    )


def calculate_tax_reserve(*, tax_base: float, tax_rate_percent: float) -> float:
    return _safe_amount(tax_base) * _safe_amount(tax_rate_percent) / 100


def calculate_project_finance_summary(
    *,
    entries: list[ProjectLedgerFinanceInput],
    received_total: float,
    area_m2: float,
    tax_rate_percent: float = 0.0,
    tax_base: float | None = None,
) -> ProjectFinanceSummary:
    safe_received_total = _safe_amount(received_total)
    safe_area_m2 = _safe_amount(area_m2)
    safe_tax_rate_percent = _safe_amount(tax_rate_percent)
    safe_tax_base = safe_received_total if tax_base is None else _safe_amount(tax_base)

    entry_amounts = [calculate_ledger_entry_amounts(entry) for entry in entries]

    paid_expense_total = sum(amounts.paid_amount for amounts in entry_amounts)
    planned_expense_total = sum(amounts.planned_amount for amounts in entry_amounts)
    committed_unpaid_total = sum(amounts.committed_unpaid_amount for amounts in entry_amounts)
    work_amount = sum(amounts.work_amount for amounts in entry_amounts)
    materials_amount = sum(amounts.materials_amount for amounts in entry_amounts)

    cash_balance = safe_received_total - paid_expense_total
    available_after_plan = safe_received_total - paid_expense_total - planned_expense_total
    available_after_obligations = (
        safe_received_total - paid_expense_total - planned_expense_total - committed_unpaid_total
    )
    tax_reserve_total = calculate_tax_reserve(
        tax_base=safe_tax_base,
        tax_rate_percent=safe_tax_rate_percent,
    )

    return ProjectFinanceSummary(
        received_total=safe_received_total,
        paid_expense_total=paid_expense_total,
        planned_expense_total=planned_expense_total,
        committed_unpaid_total=committed_unpaid_total,
        cash_balance=cash_balance,
        available_after_plan=available_after_plan,
        available_after_obligations=available_after_obligations,
        tax_base=safe_tax_base,
        tax_rate_percent=safe_tax_rate_percent,
        tax_reserve_total=tax_reserve_total,
        net_available=available_after_obligations - tax_reserve_total,
        work_amount=work_amount,
        materials_amount=materials_amount,
        work_per_m2=work_amount / safe_area_m2 if safe_area_m2 > 0 else 0.0,
        materials_per_m2=materials_amount / safe_area_m2 if safe_area_m2 > 0 else 0.0,
    )
