from __future__ import annotations

import unittest

from supply_bot.projects.domain.finance import (
    ProjectLedgerFinanceInput,
    calculate_ledger_entry_amounts,
    calculate_project_finance_summary,
)


def _entry(
    *,
    status: str = "planned",
    category: str = "",
    plan_amount: float | int | str | None = 0.0,
    actual_amount: float | int | str | None = 0.0,
) -> ProjectLedgerFinanceInput:
    return ProjectLedgerFinanceInput(
        status=status,
        category=category,
        plan_amount=plan_amount,
        actual_amount=actual_amount,
    )


class ProjectFinanceDomainTests(unittest.TestCase):
    def test_empty_ledger_returns_zero_totals(self) -> None:
        summary = calculate_project_finance_summary(entries=[], received_total=0, area_m2=0)

        self.assertEqual(summary.received_total, 0.0)
        self.assertEqual(summary.paid_expense_total, 0.0)
        self.assertEqual(summary.planned_expense_total, 0.0)
        self.assertEqual(summary.committed_unpaid_total, 0.0)
        self.assertEqual(summary.cash_balance, 0.0)
        self.assertEqual(summary.available_after_plan, 0.0)
        self.assertEqual(summary.available_after_obligations, 0.0)
        self.assertEqual(summary.tax_reserve_total, 0.0)
        self.assertEqual(summary.net_available, 0.0)
        self.assertEqual(summary.work_amount, 0.0)
        self.assertEqual(summary.materials_amount, 0.0)
        self.assertEqual(summary.work_per_m2, 0.0)
        self.assertEqual(summary.materials_per_m2, 0.0)

    def test_only_advance_keeps_received_total_available(self) -> None:
        summary = calculate_project_finance_summary(entries=[], received_total=100000, area_m2=0)

        self.assertEqual(summary.cash_balance, 100000.0)
        self.assertEqual(summary.available_after_plan, 100000.0)
        self.assertEqual(summary.net_available, 100000.0)

    def test_advance_with_paid_expense_reduces_cash_balance(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[_entry(status="paid", plan_amount=30000)],
            received_total=100000,
            area_m2=0,
        )

        self.assertEqual(summary.paid_expense_total, 30000.0)
        self.assertEqual(summary.cash_balance, 70000.0)

    def test_advance_with_paid_and_planned_expense_reduces_available_after_plan(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[_entry(status="planned", plan_amount=62600)],
            received_total=1064370.98,
            area_m2=0,
        )

        self.assertEqual(summary.paid_expense_total, 0.0)
        self.assertEqual(summary.planned_expense_total, 62600.0)
        self.assertAlmostEqual(summary.available_after_plan, 1001770.98)

    def test_invoice_counts_as_committed_unpaid_obligation(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[_entry(status="invoice", plan_amount=50000)],
            received_total=100000,
            area_m2=0,
        )

        self.assertEqual(summary.committed_unpaid_total, 50000.0)
        self.assertEqual(summary.available_after_plan, 100000.0)
        self.assertEqual(summary.available_after_obligations, 50000.0)

    def test_waiting_payment_counts_as_committed_unpaid_obligation(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[_entry(status="waiting-payment", plan_amount=50000)],
            received_total=100000,
            area_m2=0,
        )

        self.assertEqual(summary.committed_unpaid_total, 50000.0)
        self.assertEqual(summary.available_after_plan, 100000.0)
        self.assertEqual(summary.available_after_obligations, 50000.0)

    def test_completed_counts_as_paid(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[_entry(status="completed", plan_amount=30000)],
            received_total=100000,
            area_m2=0,
        )

        self.assertEqual(summary.paid_expense_total, 30000.0)
        self.assertEqual(summary.cash_balance, 70000.0)

    def test_actual_amount_takes_priority_except_planned_status(self) -> None:
        paid = calculate_ledger_entry_amounts(_entry(status="paid", plan_amount=100, actual_amount=150))
        completed = calculate_ledger_entry_amounts(_entry(status="completed", plan_amount=100, actual_amount=150))
        invoice = calculate_ledger_entry_amounts(_entry(status="invoice", plan_amount=100, actual_amount=150))
        waiting = calculate_ledger_entry_amounts(
            _entry(status="waiting-payment", plan_amount=100, actual_amount=150)
        )
        planned = calculate_ledger_entry_amounts(_entry(status="planned", plan_amount=100, actual_amount=150))

        self.assertEqual(paid.paid_amount, 150.0)
        self.assertEqual(completed.paid_amount, 150.0)
        self.assertEqual(invoice.committed_unpaid_amount, 150.0)
        self.assertEqual(waiting.committed_unpaid_amount, 150.0)
        self.assertEqual(planned.planned_amount, 100.0)

    def test_unknown_status_is_treated_as_planned(self) -> None:
        amounts = calculate_ledger_entry_amounts(_entry(status="unknown", plan_amount=123, actual_amount=456))

        self.assertEqual(amounts.planned_amount, 123.0)
        self.assertEqual(amounts.paid_amount, 0.0)
        self.assertEqual(amounts.committed_unpaid_amount, 0.0)
        self.assertEqual(amounts.committed_amount, 123.0)

    def test_tax_reserve_reduces_net_available(self) -> None:
        summary = calculate_project_finance_summary(
            entries=[],
            received_total=100000,
            area_m2=0,
            tax_rate_percent=6,
        )

        self.assertEqual(summary.tax_base, 100000.0)
        self.assertEqual(summary.tax_reserve_total, 6000.0)
        self.assertEqual(summary.net_available, 94000.0)

    def test_area_metrics_use_legacy_category_labels_without_division_by_zero(self) -> None:
        entries = [
            _entry(status="paid", category="Работы", plan_amount=30000),
            _entry(status="planned", category="Материалы", plan_amount=20000),
        ]

        summary = calculate_project_finance_summary(entries=entries, received_total=100000, area_m2=10)
        zero_area_summary = calculate_project_finance_summary(entries=entries, received_total=100000, area_m2=0)

        self.assertEqual(summary.work_amount, 30000.0)
        self.assertEqual(summary.materials_amount, 20000.0)
        self.assertEqual(summary.work_per_m2, 3000.0)
        self.assertEqual(summary.materials_per_m2, 2000.0)
        self.assertEqual(zero_area_summary.work_per_m2, 0.0)
        self.assertEqual(zero_area_summary.materials_per_m2, 0.0)

    def test_invalid_numeric_values_are_clamped_to_zero(self) -> None:
        planned = calculate_ledger_entry_amounts(_entry(status="planned", plan_amount=None, actual_amount=""))
        paid = calculate_ledger_entry_amounts(_entry(status="paid", plan_amount=-10, actual_amount="abc"))
        summary = calculate_project_finance_summary(
            entries=[_entry(status="invoice", plan_amount=-1, actual_amount="abc")],
            received_total=-100,
            area_m2="abc",  # type: ignore[arg-type]
            tax_rate_percent=-6,
        )

        self.assertEqual(planned.planned_amount, 0.0)
        self.assertEqual(paid.paid_amount, 0.0)
        self.assertEqual(summary.received_total, 0.0)
        self.assertEqual(summary.committed_unpaid_total, 0.0)
        self.assertEqual(summary.tax_reserve_total, 0.0)


if __name__ == "__main__":
    unittest.main()
