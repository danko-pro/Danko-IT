from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings


class AdminProjectPassportRouteTests(TestCase):
    def _create_settings_file(self, root: Path) -> Path:
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

    def test_project_passport_fields_roundtrip(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_response = client.post(
                    "/api/projects",
                    json={
                        "code": "PS / 01",
                        "name": "Паспортный объект",
                        "address": "Москва, Пресненская набережная, 8",
                        "apartment": "1201",
                        "floor": "12",
                        "has_elevator": True,
                        "site_access": "По пропуску",
                        "intercom_code": "2468",
                        "responsible_person": "Даниил",
                        "area_m2": 118.4,
                        "planned_margin_percent": 27.5,
                    },
                )
                self.assertEqual(create_response.status_code, 200)
                created = create_response.json()
                project_id = int(created["id"])

                self.assertEqual(created["address"], "Москва, Пресненская набережная, 8")
                self.assertEqual(created["apartment"], "1201")
                self.assertEqual(created["floor"], "12")
                self.assertTrue(created["has_elevator"])
                self.assertEqual(created["site_access"], "По пропуску")
                self.assertEqual(created["intercom_code"], "2468")
                self.assertEqual(created["responsible_person"], "Даниил")
                self.assertEqual(created["area_m2"], 118.4)
                self.assertEqual(created["planned_margin_percent"], 27.5)

                update_response = client.patch(
                    f"/api/projects/{project_id}",
                    json={
                        "address": "Москва, Пресненская набережная, 10",
                        "apartment": "1402",
                        "floor": "14",
                        "has_elevator": False,
                        "site_access": "Свободный въезд",
                        "intercom_code": "",
                        "responsible_person": "Анна",
                        "area_m2": 122.0,
                        "planned_margin_percent": 30,
                    },
                )
                self.assertEqual(update_response.status_code, 200)
                updated = update_response.json()

                self.assertEqual(updated["address"], "Москва, Пресненская набережная, 10")
                self.assertEqual(updated["apartment"], "1402")
                self.assertEqual(updated["floor"], "14")
                self.assertFalse(updated["has_elevator"])
                self.assertEqual(updated["site_access"], "Свободный въезд")
                self.assertEqual(updated["intercom_code"], "")
                self.assertEqual(updated["responsible_person"], "Анна")
                self.assertEqual(updated["area_m2"], 122.0)
                self.assertEqual(updated["planned_margin_percent"], 30.0)

                detail_response = client.get(f"/api/projects/{project_id}")
                self.assertEqual(detail_response.status_code, 200)
                detail = detail_response.json()
                self.assertEqual(detail["responsible_person"], "Анна")
                self.assertFalse(detail["has_elevator"])
