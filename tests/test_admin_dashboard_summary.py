from __future__ import annotations

import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import SESSION_COOKIE_NAME
from supply_bot.config import load_settings


def _create_settings_file(root: Path) -> Path:
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                "ADMIN_PASSWORD_HASH=your_admin_password_hash_here",
                "ADMIN_SESSION_SECRET=your_admin_session_secret_here",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


class AdminDashboardSummaryTests(unittest.TestCase):
    def test_dashboard_summary_is_owner_scoped_and_does_not_use_legacy_connection(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            suffix = uuid4().hex
            settings = replace(
                load_settings(_create_settings_file(root)),
                admin_session_secret=f"phase5d-test-session-secret-{suffix}",
            )

            with TestClient(create_admin_app(settings)) as client:
                user_one_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5d-user-one-{suffix}@example.test",
                        "password": "password-one",
                        "display_name": "Phase 5D user one",
                    },
                )
                self.assertEqual(user_one_response.status_code, 200)
                user_one_cookie = client.cookies.get(SESSION_COOKIE_NAME)

                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "DSH / 01",
                        "name": "Dashboard owner project",
                        "received_total": 1000,
                        "remaining_total": 700,
                        "planned_total": 400,
                        "actual_total": 300,
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)

                with patch(
                    "supply_bot.admin_api.app_routes_support.get_storage",
                    side_effect=AssertionError("dashboard summary must not use legacy storage"),
                ):
                    user_one_summary_response = client.get("/api/dashboard/summary")
                self.assertEqual(user_one_summary_response.status_code, 200)
                user_one_summary = user_one_summary_response.json()
                self.assertEqual(user_one_summary["projects_count"], 1)
                self.assertEqual(user_one_summary["project_received_total"], 1000.0)
                self.assertEqual(user_one_summary["project_remaining_total"], 700.0)
                self.assertEqual(user_one_summary["project_planned_total"], 400.0)
                self.assertEqual(user_one_summary["project_actual_total"], 300.0)

                user_two_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5d-user-two-{suffix}@example.test",
                        "password": "password-two",
                        "display_name": "Phase 5D user two",
                    },
                )
                self.assertEqual(user_two_response.status_code, 200)

                user_two_summary_response = client.get("/api/dashboard/summary")
                self.assertEqual(user_two_summary_response.status_code, 200)
                user_two_summary = user_two_summary_response.json()
                self.assertEqual(user_two_summary["projects_count"], 0)
                self.assertEqual(user_two_summary["project_received_total"], 0.0)
                self.assertEqual(user_two_summary["project_actual_total"], 0.0)

                client.cookies.set(SESSION_COOKIE_NAME, user_one_cookie)
                restored_summary_response = client.get("/api/dashboard/summary")
                self.assertEqual(restored_summary_response.status_code, 200)
                self.assertEqual(restored_summary_response.json()["projects_count"], 1)
