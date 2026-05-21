from __future__ import annotations

import unittest
from pathlib import Path

from supply_bot.projects.application.finance_read_model import (
    FINANCE_SUMMARY_PAYLOAD_KEYS,
    build_project_finance_summary_payload,
)
from tests.test_projects_application_list_project_ledger_entries import _ledger_entry_row
from tests.test_projects_application_list_projects import _project_row

REPO_ROOT = Path(__file__).resolve().parents[1]
FINANCE_READ_MODEL_PATH = REPO_ROOT / "src" / "supply_bot" / "projects" / "application" / "finance_read_model.py"


class ProjectFinanceReadModelTests(unittest.TestCase):
    def test_empty_ledger_uses_project_received_total(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000),
            ledger_entries=[],
        )

        self.assertEqual(payload["received_total"], 100000.0)
        self.assertEqual(payload["paid_expense_total"], 0.0)
        self.assertEqual(payload["planned_expense_total"], 0.0)
        self.assertEqual(payload["cash_balance"], 100000.0)
        self.assertEqual(payload["available_after_plan"], 100000.0)
        self.assertEqual(payload["net_available"], 100000.0)

    def test_paid_and_planned_entries_compute_available_after_plan(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=1064370.98),
            ledger_entries=[
                _ledger_entry_row(status="paid", plan_amount=0, actual_amount=0),
                _ledger_entry_row(status="planned", plan_amount=62600, actual_amount=0),
            ],
        )

        self.assertEqual(payload["paid_expense_total"], 0.0)
        self.assertEqual(payload["planned_expense_total"], 62600.0)
        self.assertAlmostEqual(payload["available_after_plan"], 1001770.98)

    def test_invoice_and_waiting_payment_reduce_available_after_obligations(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000),
            ledger_entries=[
                _ledger_entry_row(status="invoice", plan_amount=50000, actual_amount=0),
                _ledger_entry_row(status="waiting-payment", plan_amount=25000, actual_amount=0),
            ],
        )

        self.assertEqual(payload["committed_unpaid_total"], 75000.0)
        self.assertEqual(payload["available_after_plan"], 100000.0)
        self.assertEqual(payload["available_after_obligations"], 25000.0)

    def test_area_metrics_use_work_and_material_categories(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000, area_m2=10),
            ledger_entries=[
                _ledger_entry_row(status="paid", category="Работы", plan_amount=30000, actual_amount=0),
                _ledger_entry_row(status="planned", category="Материалы", plan_amount=20000, actual_amount=0),
            ],
        )

        self.assertEqual(payload["work_amount"], 30000.0)
        self.assertEqual(payload["materials_amount"], 20000.0)
        self.assertEqual(payload["work_per_m2"], 3000.0)
        self.assertEqual(payload["materials_per_m2"], 2000.0)

    def test_tax_rate_is_zero_until_tax_runtime_stage(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000),
            ledger_entries=[_ledger_entry_row(status="invoice", plan_amount=10000, actual_amount=0)],
        )

        self.assertEqual(payload["tax_rate_percent"], 0.0)
        self.assertEqual(payload["tax_base"], 100000.0)
        self.assertEqual(payload["tax_reserve_total"], 0.0)
        self.assertEqual(payload["net_available"], payload["available_after_obligations"])

    def test_planned_margin_percent_does_not_affect_tax_rate(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000, planned_margin_percent=30),
            ledger_entries=[],
        )

        self.assertEqual(payload["tax_rate_percent"], 0.0)
        self.assertEqual(payload["tax_base"], 100000.0)
        self.assertEqual(payload["tax_reserve_total"], 0.0)
        self.assertEqual(payload["net_available"], 100000.0)

    def test_serialization_shape_contains_only_expected_keys(self) -> None:
        payload = build_project_finance_summary_payload(
            project=_project_row(received_total=100000),
            ledger_entries=[],
        )

        self.assertEqual(set(payload), set(FINANCE_SUMMARY_PAYLOAD_KEYS))


class ProjectFinanceReadModelArchitectureTests(unittest.TestCase):
    def test_finance_read_model_uses_domain_engine_without_forbidden_dependencies(self) -> None:
        source = FINANCE_READ_MODEL_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("calculate_project_finance_summary", source)
        for forbidden in ("fastapi", "sqlalchemy", "admin_api", "storage", "request", "response"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
