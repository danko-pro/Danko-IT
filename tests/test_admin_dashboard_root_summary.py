from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminDashboardRootSummaryTests(AdminProjectsRouteCase):
    def test_dashboard_root_summary_requires_admin_session_when_auth_enabled(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_auth_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                response = client.get("/api/dashboard/root-summary")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Admin authentication required")

    def test_dashboard_root_summary_empty_projects(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                response = client.get("/api/dashboard/root-summary")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "summary": {
                    "received_total": 0.0,
                    "paid_expense_total": 0.0,
                    "planned_expense_total": 0.0,
                    "committed_unpaid_total": 0.0,
                    "cash_balance": 0.0,
                    "available_after_plan": 0.0,
                    "available_after_obligations": 0.0,
                    "tax_reserve_total": 0.0,
                    "net_available": 0.0,
                },
                "projects": [],
            },
        )

    def test_dashboard_root_summary_aggregates_project_finance_and_risks(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                first_project_id = self._create_project(
                    client,
                    code="ROOT / 01",
                    name="Root summary first",
                    received_total=100000,
                    tax_rate_percent=6,
                )
                self._create_ledger_entry(
                    client,
                    first_project_id,
                    status="paid",
                    plan_amount=30000,
                    actual_amount=0,
                )
                self._create_ledger_entry(
                    client,
                    first_project_id,
                    status="planned",
                    plan_amount=20000,
                    actual_amount=0,
                )
                self._create_ledger_entry(
                    client,
                    first_project_id,
                    status="invoice",
                    plan_amount=10000,
                    actual_amount=0,
                )

                second_project_id = self._create_project(
                    client,
                    code="ROOT / 02",
                    name="Root summary risk",
                    received_total=100,
                    tax_rate_percent=6,
                )
                self._create_ledger_entry(
                    client,
                    second_project_id,
                    status="planned",
                    plan_amount=80,
                    actual_amount=0,
                )
                self._create_ledger_entry(
                    client,
                    second_project_id,
                    status="waiting-payment",
                    plan_amount=30,
                    actual_amount=0,
                )

                list_before = client.get("/api/projects").json()
                detail_before = client.get(f"/api/projects/{first_project_id}").json()
                response = client.get("/api/dashboard/root-summary")
                list_after = client.get("/api/projects").json()
                detail_after = client.get(f"/api/projects/{first_project_id}").json()

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(set(payload), {"summary", "projects"})
        self.assertEqual(payload["summary"]["received_total"], 100100.0)
        self.assertEqual(payload["summary"]["paid_expense_total"], 30000.0)
        self.assertEqual(payload["summary"]["planned_expense_total"], 20080.0)
        self.assertEqual(payload["summary"]["committed_unpaid_total"], 10030.0)
        self.assertEqual(payload["summary"]["cash_balance"], 70100.0)
        self.assertEqual(payload["summary"]["available_after_plan"], 50020.0)
        self.assertEqual(payload["summary"]["available_after_obligations"], 39990.0)
        self.assertEqual(payload["summary"]["tax_reserve_total"], 6006.0)
        self.assertEqual(payload["summary"]["net_available"], 33984.0)

        projects_by_id = {row["project_id"]: row for row in payload["projects"]}
        self.assertEqual(projects_by_id[first_project_id]["risk_status"], "ok")
        self.assertEqual(projects_by_id[first_project_id]["risk_flags"], [])
        self.assertEqual(projects_by_id[first_project_id]["finance_summary"]["tax_reserve_total"], 6000.0)

        risk_row = projects_by_id[second_project_id]
        self.assertEqual(risk_row["risk_status"], "critical")
        self.assertEqual(
            risk_row["risk_flags"],
            ["negative_net_available", "obligation_pressure", "tax_pressure"],
        )

        self.assertEqual(list_before, list_after)
        self.assertNotIn("finance_summary", list_after[0])
        self.assertEqual(detail_before, detail_after)
        self.assertIn("finance_summary", detail_after)

    def _create_project(
        self,
        client: TestClient,
        *,
        code: str,
        name: str,
        received_total: float,
        tax_rate_percent: float,
    ) -> int:
        response = client.post(
            "/api/projects",
            json={
                "code": code,
                "name": name,
                "received_total": received_total,
                "tax_rate_percent": tax_rate_percent,
                "tax_base_mode": "received_total",
            },
        )
        self.assertEqual(response.status_code, 200)
        return int(response.json()["id"])

    def _create_auth_settings_file(self, root: Path) -> Path:
        config_path = root / ".env.test"
        config_path.write_text(
            "\n".join(
                [
                    "BOT_TOKEN=test-token",
                    "DEBUG=1",
                    "DATABASE_PATH=./test.sqlite3",
                    f"ADMIN_PASSWORD_HASH={hash_admin_password('admin-pass', salt='fixed-salt', iterations=120000)}",
                    "ADMIN_SESSION_SECRET=test-session-secret",
                    "ADMIN_SESSION_TTL_SECONDS=3600",
                    "PROJECT_DOCUMENTS_DIR=./project-documents",
                ]
            ),
            encoding="utf-8",
        )
        return config_path

    def _create_ledger_entry(
        self,
        client: TestClient,
        project_id: int,
        *,
        status: str,
        plan_amount: float,
        actual_amount: float,
    ) -> None:
        response = client.post(
            f"/api/projects/{project_id}/ledger",
            json={
                "category": "Работы",
                "item": f"{status} entry",
                "status": status,
                "plan_amount": plan_amount,
                "actual_amount": actual_amount,
                "control_date": "2026-05-22",
            },
        )
        self.assertEqual(response.status_code, 200)
