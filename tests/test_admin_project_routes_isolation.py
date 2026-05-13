from __future__ import annotations

import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
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


class AdminProjectRouteIsolationTests(unittest.TestCase):
    def test_registered_users_have_isolated_project_routes(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            suffix = uuid4().hex
            settings = replace(
                load_settings(_create_settings_file(root)),
                admin_session_secret=f"phase5c-test-session-secret-{suffix}",
            )

            with TestClient(create_admin_app(settings)) as client:
                user_one_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5c-user-one-{suffix}@example.test",
                        "password": "password-one",
                        "display_name": "Phase 5C user one",
                    },
                )
                self.assertEqual(user_one_response.status_code, 200)
                user_one_cookie = client.cookies.get(SESSION_COOKIE_NAME)

                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "ISO / 01",
                        "name": "Изолированный проект",
                        "address": "Калининград",
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                user_one_list = client.get("/api/projects")
                self.assertEqual(user_one_list.status_code, 200)
                self.assertEqual([project["id"] for project in user_one_list.json()], [project_id])

                user_two_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5c-user-two-{suffix}@example.test",
                        "password": "password-two",
                        "display_name": "Phase 5C user two",
                    },
                )
                self.assertEqual(user_two_response.status_code, 200)

                user_two_list = client.get("/api/projects")
                self.assertEqual(user_two_list.status_code, 200)
                self.assertEqual(user_two_list.json(), [])
                self.assertEqual(client.get(f"/api/projects/{project_id}").status_code, 404)

                client.cookies.set(SESSION_COOKIE_NAME, user_one_cookie)
                update_response = client.patch(
                    f"/api/projects/{project_id}",
                    json={"name": "Изолированный проект обновлен"},
                )
                self.assertEqual(update_response.status_code, 200)
                self.assertEqual(update_response.json()["name"], "Изолированный проект обновлен")
