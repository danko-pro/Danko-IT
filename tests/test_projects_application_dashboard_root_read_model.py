from __future__ import annotations

import unittest
from pathlib import Path

from supply_bot.projects.application.dashboard_root_read_model import (
    DASHBOARD_ROOT_SUMMARY_KEYS,
    RISK_NEGATIVE_NET_AVAILABLE,
    RISK_OBLIGATION_PRESSURE,
    RISK_PLAN_PRESSURE,
    RISK_TAX_PRESSURE,
    build_dashboard_root_summary_payload,
)
from tests.test_projects_application_list_project_ledger_entries import _ledger_entry_row
from tests.test_projects_application_list_projects import _project_row

REPO_ROOT = Path(__file__).resolve().parents[1]
DASHBOARD_ROOT_READ_MODEL_PATH = (
    REPO_ROOT / "src" / "supply_bot" / "projects" / "application" / "dashboard_root_read_model.py"
)


class DashboardRootReadModelTests(unittest.TestCase):
    def test_empty_projects_return_zero_summary_and_empty_rows(self) -> None:
        payload = build_dashboard_root_summary_payload(
            projects=[],
            ledger_entries_by_project={},
        )

        self.assertEqual(payload["summary"], {key: 0.0 for key in DASHBOARD_ROOT_SUMMARY_KEYS})
        self.assertEqual(payload["projects"], [])

    def test_one_project_builds_finance_summary_and_aggregate_with_tax(self) -> None:
        project = _project_row(
            id=10,
            code="PR-10",
            name="Project A",
            stage_label="Active",
            received_total=100000,
            tax_rate_percent=6,
        )
        payload = build_dashboard_root_summary_payload(
            projects=[project],
            ledger_entries_by_project={
                10: [
                    _ledger_entry_row(project_id=10, status="paid", plan_amount=30000, actual_amount=0),
                    _ledger_entry_row(project_id=10, status="planned", plan_amount=20000, actual_amount=0),
                    _ledger_entry_row(project_id=10, status="invoice", plan_amount=10000, actual_amount=0),
                ],
            },
        )

        self.assertEqual(payload["summary"]["received_total"], 100000.0)
        self.assertEqual(payload["summary"]["paid_expense_total"], 30000.0)
        self.assertEqual(payload["summary"]["planned_expense_total"], 20000.0)
        self.assertEqual(payload["summary"]["committed_unpaid_total"], 10000.0)
        self.assertEqual(payload["summary"]["cash_balance"], 70000.0)
        self.assertEqual(payload["summary"]["available_after_plan"], 50000.0)
        self.assertEqual(payload["summary"]["available_after_obligations"], 40000.0)
        self.assertEqual(payload["summary"]["tax_reserve_total"], 6000.0)
        self.assertEqual(payload["summary"]["net_available"], 34000.0)
        self.assertEqual(
            payload["projects"][0],
            {
                "project_id": 10,
                "code": "PR-10",
                "name": "Project A",
                "stage_label": "Active",
                "finance_summary": payload["projects"][0]["finance_summary"],
                "risk_status": "ok",
                "risk_flags": [],
            },
        )
        self.assertEqual(payload["projects"][0]["finance_summary"]["tax_rate_percent"], 6.0)

    def test_multiple_projects_aggregate_sum_of_project_finance_summaries(self) -> None:
        first_project = _project_row(id=10, received_total=100)
        second_project = _project_row(id=20, received_total=200)

        payload = build_dashboard_root_summary_payload(
            projects=[first_project, second_project],
            ledger_entries_by_project={
                10: [_ledger_entry_row(project_id=10, status="paid", plan_amount=30, actual_amount=0)],
                20: [
                    _ledger_entry_row(project_id=20, status="planned", plan_amount=50, actual_amount=0),
                    _ledger_entry_row(project_id=20, status="waiting-payment", plan_amount=25, actual_amount=0),
                ],
            },
        )

        self.assertEqual(payload["summary"]["received_total"], 300.0)
        self.assertEqual(payload["summary"]["paid_expense_total"], 30.0)
        self.assertEqual(payload["summary"]["planned_expense_total"], 50.0)
        self.assertEqual(payload["summary"]["committed_unpaid_total"], 25.0)
        self.assertEqual(payload["summary"]["cash_balance"], 270.0)
        self.assertEqual(payload["summary"]["available_after_plan"], 220.0)
        self.assertEqual(payload["summary"]["available_after_obligations"], 195.0)
        self.assertEqual(payload["summary"]["net_available"], 195.0)

    def test_legacy_project_summary_fields_are_not_used_for_aggregate_summary(self) -> None:
        project = _project_row(
            received_total=100,
            planned_total=9999,
            actual_total=8888,
            remaining_total=7777,
            deferred_total=6666,
        )

        payload = build_dashboard_root_summary_payload(
            projects=[project],
            ledger_entries_by_project={10: []},
        )

        self.assertEqual(payload["summary"]["received_total"], 100.0)
        self.assertEqual(payload["summary"]["paid_expense_total"], 0.0)
        self.assertEqual(payload["summary"]["planned_expense_total"], 0.0)
        self.assertEqual(payload["summary"]["committed_unpaid_total"], 0.0)
        self.assertEqual(payload["summary"]["cash_balance"], 100.0)
        self.assertEqual(payload["summary"]["net_available"], 100.0)

    def test_ledger_statuses_flow_through_existing_finance_engine(self) -> None:
        project = _project_row(received_total=200)

        payload = build_dashboard_root_summary_payload(
            projects=[project],
            ledger_entries_by_project={
                10: [
                    _ledger_entry_row(status="planned", plan_amount=10, actual_amount=999),
                    _ledger_entry_row(status="invoice", plan_amount=20, actual_amount=0),
                    _ledger_entry_row(status="waiting-payment", plan_amount=25, actual_amount=0),
                    _ledger_entry_row(status="paid", plan_amount=30, actual_amount=40),
                    _ledger_entry_row(status="completed", plan_amount=50, actual_amount=0),
                ],
            },
        )

        self.assertEqual(payload["summary"]["paid_expense_total"], 90.0)
        self.assertEqual(payload["summary"]["planned_expense_total"], 10.0)
        self.assertEqual(payload["summary"]["committed_unpaid_total"], 45.0)
        self.assertEqual(payload["summary"]["cash_balance"], 110.0)
        self.assertEqual(payload["summary"]["available_after_plan"], 100.0)
        self.assertEqual(payload["summary"]["available_after_obligations"], 55.0)

    def test_risk_flags_and_status_are_generated_from_finance_summary(self) -> None:
        project = _project_row(received_total=100, tax_rate_percent=6)

        payload = build_dashboard_root_summary_payload(
            projects=[project],
            ledger_entries_by_project={
                10: [
                    _ledger_entry_row(status="planned", plan_amount=80, actual_amount=0),
                    _ledger_entry_row(status="invoice", plan_amount=30, actual_amount=0),
                ],
            },
        )

        row = payload["projects"][0]
        self.assertEqual(row["risk_status"], "critical")
        self.assertEqual(
            row["risk_flags"],
            [
                RISK_NEGATIVE_NET_AVAILABLE,
                RISK_OBLIGATION_PRESSURE,
                RISK_TAX_PRESSURE,
            ],
        )
        self.assertNotIn(RISK_PLAN_PRESSURE, row["risk_flags"])

    def test_invalid_amounts_are_normalized_by_existing_finance_engine(self) -> None:
        project = _project_row(id="bad", received_total="abc")

        payload = build_dashboard_root_summary_payload(
            projects=[project],
            ledger_entries_by_project={
                0: [_ledger_entry_row(status="unknown", plan_amount=-10, actual_amount="bad")],
            },
        )

        self.assertEqual(payload["projects"][0]["project_id"], 0)
        self.assertEqual(payload["summary"], {key: 0.0 for key in DASHBOARD_ROOT_SUMMARY_KEYS})


class DashboardRootReadModelArchitectureTests(unittest.TestCase):
    def test_read_model_uses_project_finance_read_model_without_forbidden_dependencies(self) -> None:
        source = DASHBOARD_ROOT_READ_MODEL_PATH.read_text(encoding="utf-8").lower()

        self.assertIn("build_project_finance_summary_payload", source)
        for forbidden in ("fastapi", "sqlalchemy", "admin_api", "storage", "request", "response"):
            self.assertNotIn(forbidden, source)
        for legacy_field in ("planned_total", "actual_total", "remaining_total", "deferred_total"):
            self.assertNotIn(legacy_field, source)


if __name__ == "__main__":
    unittest.main()
