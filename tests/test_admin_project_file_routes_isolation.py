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


class AdminProjectFileRouteIsolationTests(unittest.TestCase):
    def test_project_files_are_owner_scoped_and_contract_delete_removes_file(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            suffix = uuid4().hex
            settings = replace(
                load_settings(_create_settings_file(root)),
                admin_session_secret=f"phase5e-test-session-secret-{suffix}",
            )

            with TestClient(create_admin_app(settings)) as client:
                user_one_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5e-user-one-{suffix}@example.test",
                        "password": "password-one",
                        "display_name": "Phase 5E user one",
                    },
                )
                self.assertEqual(user_one_response.status_code, 200)
                user_one_cookie = client.cookies.get(SESSION_COOKIE_NAME)

                create_project_response = client.post(
                    "/api/projects",
                    json={"code": "FILE / 01", "name": "Owner scoped file project"},
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                create_entry_response = client.post(
                    f"/api/projects/{project_id}/ledger",
                    json={
                        "category": "Materials",
                        "item": "Invoice item",
                        "status": "invoice",
                        "plan_amount": 100,
                        "actual_amount": 0,
                        "control_date": "2026-04-25",
                    },
                )
                self.assertEqual(create_entry_response.status_code, 200)
                entry_id = int(create_entry_response.json()["entry"]["id"])

                upload_document_response = client.post(
                    f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/upload",
                    files={"file": ("invoice.txt", b"invoice text", "text/plain")},
                )
                self.assertEqual(upload_document_response.status_code, 200)

                upload_contract_response = client.post(
                    f"/api/projects/{project_id}/contract/upload",
                    files={"file": ("contract.txt", b"contract text", "text/plain")},
                )
                self.assertEqual(upload_contract_response.status_code, 200)

                self.assertEqual(
                    client.get(f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/download").status_code,
                    200,
                )
                self.assertEqual(client.get(f"/api/projects/{project_id}/contract/download").status_code, 200)

                contract_files = list(settings.project_documents_dir.rglob("contract-*"))
                self.assertEqual(len(contract_files), 1)

                user_two_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase5e-user-two-{suffix}@example.test",
                        "password": "password-two",
                        "display_name": "Phase 5E user two",
                    },
                )
                self.assertEqual(user_two_response.status_code, 200)

                self.assertEqual(
                    client.get(f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/download").status_code,
                    404,
                )
                self.assertEqual(client.get(f"/api/projects/{project_id}/contract/download").status_code, 404)
                self.assertEqual(client.delete(f"/api/projects/{project_id}/contract").status_code, 404)

                client.cookies.set(SESSION_COOKIE_NAME, user_one_cookie)
                delete_contract_response = client.delete(f"/api/projects/{project_id}/contract")
                self.assertEqual(delete_contract_response.status_code, 200)
                self.assertEqual(delete_contract_response.json(), {"deleted": True, "project_id": project_id})
                self.assertEqual(list(settings.project_documents_dir.rglob("contract-*")), [])
