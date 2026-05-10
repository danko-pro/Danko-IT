from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminProjectsLedgerRouteTests(AdminProjectsRouteCase):
    def test_project_ledger_roundtrip_and_update_summary(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "ЛД / 01",
                        "name": "Объект с учетом",
                        "area_m2": 100,
                        "received_total": 500,
                        "remaining_total": 500,
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project = create_project_response.json()
                project_id = int(project["id"])

                create_entry_response = client.post(
                    f"/api/projects/{project_id}/ledger",
                    json={
                        "category": "Работы",
                        "item": "Черновые работы",
                        "owner": "Прохоров Д.",
                        "counterparty": "ООО Баумастер Рус",
                        "status": "paid",
                        "plan_amount": 300,
                        "actual_amount": 200,
                        "control_date": "2026-04-20",
                    },
                )
                self.assertEqual(create_entry_response.status_code, 200)
                created_payload = create_entry_response.json()
                entry_id = int(created_payload["entry"]["id"])
                self.assertEqual(created_payload["entry"]["plan_amount"], 300.0)
                self.assertEqual(created_payload["entry"]["actual_amount"], 200.0)
                self.assertEqual(created_payload["project"]["planned_total"], 100.0)
                self.assertEqual(created_payload["project"]["actual_total"], 200.0)
                self.assertEqual(created_payload["project"]["remaining_total"], 300.0)
                self.assertEqual(created_payload["project"]["work_per_m2"], 2.0)
                self.assertEqual(created_payload["project"]["next_delivery_label"], "20.04")

                list_entries_response = client.get(f"/api/projects/{project_id}/ledger")
                self.assertEqual(list_entries_response.status_code, 200)
                entries = list_entries_response.json()
                self.assertEqual(len(entries), 1)
                self.assertEqual(entries[0]["item"], "Черновые работы")

                update_entry_response = client.patch(
                    f"/api/projects/{project_id}/ledger/{entry_id}",
                    json={
                        "category": "Материалы",
                        "plan_amount": 400,
                        "actual_amount": 250,
                        "counterparty_details": {
                            "legalName": "ООО Сан-Склад",
                            "phone": "+7 999 000-11-22",
                        },
                    },
                )
                self.assertEqual(update_entry_response.status_code, 200)
                updated_payload = update_entry_response.json()
                self.assertEqual(updated_payload["entry"]["category"], "Материалы")
                self.assertEqual(updated_payload["entry"]["counterparty_details"]["legalName"], "ООО Сан-Склад")
                self.assertEqual(updated_payload["entry"]["plan_amount"], 400.0)
                self.assertEqual(updated_payload["entry"]["actual_amount"], 250.0)
                self.assertEqual(updated_payload["project"]["planned_total"], 150.0)
                self.assertEqual(updated_payload["project"]["actual_total"], 250.0)
                self.assertEqual(updated_payload["project"]["materials_per_m2"], 2.5)

                delete_entry_response = client.delete(f"/api/projects/{project_id}/ledger/{entry_id}")
                self.assertEqual(delete_entry_response.status_code, 200)
                deleted_payload = delete_entry_response.json()
                self.assertEqual(deleted_payload["project"]["planned_total"], 0.0)
                self.assertEqual(deleted_payload["project"]["actual_total"], 0.0)
                self.assertEqual(deleted_payload["project"]["remaining_total"], 500.0)
                self.assertEqual(deleted_payload["project"]["next_delivery_label"], "")

    def test_project_ledger_document_upload_update_and_download(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "DOC / 01",
                        "name": "Объект с документами",
                        "received_total": 1000,
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                create_entry_response = client.post(
                    f"/api/projects/{project_id}/ledger",
                    json={
                        "category": "Материалы",
                        "item": "Чистовые материалы",
                        "status": "invoice",
                        "plan_amount": 620000,
                        "actual_amount": 0,
                        "control_date": "2026-04-25",
                    },
                )
                self.assertEqual(create_entry_response.status_code, 200)
                entry_id = int(create_entry_response.json()["entry"]["id"])

                upload_response = client.post(
                    f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/upload",
                    files={
                        "file": ("invoice.pdf", b"%PDF-1.4\n%test invoice\n", "application/pdf"),
                    },
                )
                self.assertEqual(upload_response.status_code, 200)
                uploaded_document = upload_response.json()["document"]
                self.assertEqual(uploaded_document["kind"], "invoice")
                self.assertEqual(uploaded_document["source_file"]["file_name"], "invoice.pdf")

                patch_response = client.patch(
                    f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice",
                    json={
                        "title": "Счет / материалы / 02",
                        "date": "2026-04-21",
                        "amount": 620000,
                        "verified_by_user": True,
                    },
                )
                self.assertEqual(patch_response.status_code, 200)
                patched_document = patch_response.json()["document"]
                self.assertEqual(patched_document["title"], "Счет / материалы / 02")
                self.assertEqual(patched_document["date"], "2026-04-21")
                self.assertTrue(patched_document["verified_by_user"])

                ledger_response = client.get(f"/api/projects/{project_id}/ledger")
                self.assertEqual(ledger_response.status_code, 200)
                ledger_entries = ledger_response.json()
                self.assertEqual(len(ledger_entries), 1)
                self.assertEqual(ledger_entries[0]["invoice_document"]["title"], "Счет / материалы / 02")

                download_response = client.get(
                    f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/download"
                )
                self.assertEqual(download_response.status_code, 200)
                self.assertEqual(download_response.headers["content-type"], "application/pdf")
                self.assertIn("invoice.pdf", download_response.headers.get("content-disposition", ""))

    def test_project_ledger_document_ai_extract_updates_reviewable_metadata(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(
                self._create_settings_file(
                    root,
                    extra_lines=[
                        "SUPPLY_DIALOGUE_ENABLED=1",
                        "SUPPLY_DIALOGUE_PRIMARY_PROVIDER=openai",
                        "OPENAI_API_KEY=test-openai-key",
                    ],
                )
            )

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/projects",
                    json={"code": "DOC / AI", "name": "Object with AI documents"},
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                create_entry_response = client.post(
                    f"/api/projects/{project_id}/ledger",
                    json={
                        "category": "Materials",
                        "item": "Finish materials",
                        "status": "invoice",
                        "plan_amount": 620000,
                        "actual_amount": 0,
                        "control_date": "2026-04-25",
                    },
                )
                self.assertEqual(create_entry_response.status_code, 200)
                entry_id = int(create_entry_response.json()["entry"]["id"])

                upload_response = client.post(
                    f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/upload",
                    files={"file": ("invoice.txt", b"invoice text", "text/plain")},
                )
                self.assertEqual(upload_response.status_code, 200)

                with (
                    patch(
                        "supply_bot.admin_api.project_routes.ledger_document_ai.read_project_document_text",
                        new=AsyncMock(return_value="Invoice number 33. Total 620000. Date 2026-04-21."),
                    ),
                    patch(
                        "supply_bot.admin_api.project_routes.ledger_document_ai.ProjectLedgerDocumentExtractor.extract_document",
                        new=AsyncMock(
                            return_value={
                                "title": "Invoice number 33",
                                "date": "2026-04-21",
                                "amount": 620000,
                            }
                        ),
                    ),
                ):
                    extract_response = client.post(
                        f"/api/projects/{project_id}/ledger/{entry_id}/documents/invoice/extract"
                    )

                self.assertEqual(extract_response.status_code, 200)
                document = extract_response.json()["document"]
                self.assertEqual(document["title"], "Invoice number 33")
                self.assertEqual(document["date"], "2026-04-21")
                self.assertEqual(document["amount"], 620000.0)
                self.assertTrue(document["extracted_by_ai"])
                self.assertFalse(document["verified_by_user"])
