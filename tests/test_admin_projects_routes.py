from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings


class AdminProjectsRouteTests(TestCase):
    def _create_settings_file(self, root: Path, *, extra_lines: list[str] | None = None) -> Path:
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
                    *(extra_lines or []),
                ]
            ),
            encoding="utf-8",
        )
        return config_path

    def test_projects_crud_roundtrip(self) -> None:
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
                empty_response = client.get("/api/projects")
                self.assertEqual(empty_response.status_code, 200)
                self.assertEqual(empty_response.json(), [])

                create_response = client.post(
                    "/api/projects",
                    json={
                        "code": "ИБ / 22",
                        "name": "Объект ИБ",
                        "stage_label": "В работе",
                        "stage_tone": "active",
                        "estimate_source": "Калькулятор + ручной учет",
                        "area_m2": 173.6,
                        "received_total": 2446704,
                        "remaining_total": 908094.16,
                        "planned_total": 163000,
                        "actual_total": 1538609.84,
                    },
                )
                self.assertEqual(create_response.status_code, 200)
                project = create_response.json()
                project_id = int(project["id"])
                self.assertEqual(project["code"], "ИБ / 22")
                self.assertEqual(project["stage_tone"], "active")
                self.assertEqual(project["estimate_source"], "Калькулятор + ручной учет")

                list_response = client.get("/api/projects")
                self.assertEqual(list_response.status_code, 200)
                listed = list_response.json()
                self.assertEqual(len(listed), 1)
                self.assertEqual(listed[0]["id"], project_id)

                update_response = client.patch(
                    f"/api/projects/{project_id}",
                    json={
                        "code": "ИБ / 22А",
                        "name": "Объект ИБ, этап 2",
                        "stage_label": "Черновик",
                        "stage_tone": "warn",
                        "remaining_total": 700000,
                        "next_delivery_label": "20.04",
                    },
                )
                self.assertEqual(update_response.status_code, 200)
                updated = update_response.json()
                self.assertEqual(updated["code"], "ИБ / 22А")
                self.assertEqual(updated["name"], "Объект ИБ, этап 2")
                self.assertEqual(updated["stage_tone"], "warn")
                self.assertEqual(updated["remaining_total"], 700000.0)
                self.assertEqual(updated["next_delivery_label"], "20.04")

                detail_response = client.get(f"/api/projects/{project_id}")
                self.assertEqual(detail_response.status_code, 200)
                self.assertEqual(detail_response.json()["id"], project_id)

                delete_response = client.delete(f"/api/projects/{project_id}")
                self.assertEqual(delete_response.status_code, 200)
                self.assertEqual(delete_response.json(), {"deleted": True, "project_id": project_id})

                final_list_response = client.get("/api/projects")
                self.assertEqual(final_list_response.status_code, 200)
                self.assertEqual(final_list_response.json(), [])

    def test_projects_reject_negative_summary_metrics(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                response = client.post(
                    "/api/projects",
                    json={
                        "code": "NEG / 01",
                        "name": "Тестовый объект",
                        "area_m2": -1,
                    },
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("cannot be negative", response.json()["detail"])

    def test_project_advances_roundtrip_and_update_summary(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "АВ / 01",
                        "name": "Объект с авансами",
                        "received_total": 1000,
                        "remaining_total": 250,
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project = create_project_response.json()
                project_id = int(project["id"])

                create_advance_response = client.post(
                    f"/api/projects/{project_id}/advances",
                    json={
                        "title": "Основной аванс",
                        "amount": 500,
                        "date": "2026-04-16",
                        "status": "paid",
                    },
                )
                self.assertEqual(create_advance_response.status_code, 200)
                created_payload = create_advance_response.json()
                advance_id = int(created_payload["advance"]["id"])
                self.assertEqual(created_payload["project"]["received_total"], 1500.0)
                self.assertEqual(created_payload["project"]["remaining_total"], 750.0)

                list_advances_response = client.get(f"/api/projects/{project_id}/advances")
                self.assertEqual(list_advances_response.status_code, 200)
                advances = list_advances_response.json()
                self.assertEqual(len(advances), 1)
                self.assertEqual(advances[0]["title"], "Основной аванс")

                delete_advance_response = client.delete(f"/api/projects/{project_id}/advances/{advance_id}")
                self.assertEqual(delete_advance_response.status_code, 200)
                deleted_payload = delete_advance_response.json()
                self.assertEqual(deleted_payload["project"]["received_total"], 1000.0)
                self.assertEqual(deleted_payload["project"]["remaining_total"], 250.0)

                final_advances_response = client.get(f"/api/projects/{project_id}/advances")
                self.assertEqual(final_advances_response.status_code, 200)
                self.assertEqual(final_advances_response.json(), [])

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
                self.assertEqual(created_payload["project"]["planned_total"], 300.0)
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
                self.assertEqual(updated_payload["project"]["planned_total"], 400.0)
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

    def test_project_contract_roundtrip_upload_and_milestone_update(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/projects",
                    json={
                        "code": "CON / 01",
                        "name": "Объект с договором",
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                put_contract_response = client.put(
                    f"/api/projects/{project_id}/contract",
                    json={
                        "file_name": "ДОГОВОР ПОДРЯДА 01-02-26.pdf",
                        "title": "Договор подряда на ремонт",
                        "number": "ДОГОВОР ПОДРЯДА № 01/02/26",
                        "signed_at": "2026-02-08",
                        "start_date": "2026-02-10",
                        "planned_end_date": "2026-08-30",
                        "amount": 2446704,
                        "advance_terms": "Первичный аванс 30%",
                        "extraction_status": "review",
                        "milestones": [
                            {
                                "kind": "invoice",
                                "title": "Выставить второй счет",
                                "planned_date": "2026-04-20",
                                "amount": 620000,
                                "note": "После подтверждения поставки",
                                "status": "due",
                            },
                            {
                                "kind": "payment",
                                "title": "Получить второй аванс",
                                "planned_date": "2026-04-25",
                                "amount": 620000,
                                "status": "upcoming",
                            },
                        ],
                    },
                )
                self.assertEqual(put_contract_response.status_code, 200)
                contract = put_contract_response.json()
                self.assertEqual(contract["title"], "Договор подряда на ремонт")
                self.assertEqual(len(contract["milestones"]), 2)
                first_milestone_id = int(contract["milestones"][0]["id"])

                patch_milestone_response = client.patch(
                    f"/api/projects/{project_id}/contract/milestones/{first_milestone_id}",
                    json={
                        "status": "completed",
                        "note": "Счет уже выставлен",
                    },
                )
                self.assertEqual(patch_milestone_response.status_code, 200)
                patched_contract = patch_milestone_response.json()
                self.assertEqual(patched_contract["milestones"][0]["status"], "completed")
                self.assertEqual(patched_contract["milestones"][0]["note"], "Счет уже выставлен")

                upload_contract_response = client.post(
                    f"/api/projects/{project_id}/contract/upload",
                    files={
                        "file": ("contract.pdf", b"%PDF-1.4\n%test contract\n", "application/pdf"),
                    },
                )
                self.assertEqual(upload_contract_response.status_code, 200)
                uploaded_contract = upload_contract_response.json()
                self.assertEqual(uploaded_contract["source_file"]["file_name"], "contract.pdf")
                self.assertEqual(uploaded_contract["download_url"], f"/api/projects/{project_id}/contract/download")

                get_contract_response = client.get(f"/api/projects/{project_id}/contract")
                self.assertEqual(get_contract_response.status_code, 200)
                self.assertEqual(get_contract_response.json()["number"], "ДОГОВОР ПОДРЯДА № 01/02/26")

                download_contract_response = client.get(f"/api/projects/{project_id}/contract/download")
                self.assertEqual(download_contract_response.status_code, 200)
                self.assertEqual(download_contract_response.headers["content-type"], "application/pdf")
                self.assertIn("contract.pdf", download_contract_response.headers.get("content-disposition", ""))

                delete_contract_response = client.delete(f"/api/projects/{project_id}/contract")
                self.assertEqual(delete_contract_response.status_code, 200)
                self.assertEqual(delete_contract_response.json(), {"deleted": True, "project_id": project_id})

                get_deleted_contract_response = client.get(f"/api/projects/{project_id}/contract")
                self.assertEqual(get_deleted_contract_response.status_code, 200)
                self.assertIsNone(get_deleted_contract_response.json())

    def test_project_contract_ai_extract_updates_contract(self) -> None:
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
                    json={
                        "code": "AI / 01",
                        "name": "Объект с AI-договором",
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["id"])

                client.put(
                    f"/api/projects/{project_id}/contract",
                    json={
                        "file_name": "contract.pdf",
                        "title": "Черновик договора",
                        "number": "",
                        "signed_at": "",
                        "start_date": "",
                        "planned_end_date": "",
                        "amount": 0,
                        "advance_terms": "",
                        "milestones": [],
                    },
                )
                client.post(
                    f"/api/projects/{project_id}/contract/upload",
                    files={"file": ("contract.pdf", b"%PDF-1.4\n%test contract\n", "application/pdf")},
                )

                with (
                    patch(
                        "supply_bot.admin_api.app_routes_projects.extract_contract_text",
                        return_value="Текст договора для AI проверки",
                    ),
                    patch(
                        "supply_bot.admin_api.app_routes_projects.ProjectContractExtractor.extract_contract",
                        new=AsyncMock(
                            return_value={
                                "title": "Договор подряда после AI",
                                "number": "№ 15/2026",
                                "signed_at": "2026-03-01",
                                "start_date": "2026-03-05",
                                "planned_end_date": "2026-08-30",
                                "amount": 3100000,
                                "advance_terms": "Аванс 30%, далее оплата по счетам",
                                "milestones": [
                                    {
                                        "kind": "invoice",
                                        "title": "Выставить второй счет",
                                        "planned_date": "2026-04-20",
                                        "amount": 620000,
                                        "note": "После подтверждения поставки",
                                    }
                                ],
                            }
                        ),
                    ),
                ):
                    extract_response = client.post(f"/api/projects/{project_id}/contract/extract")

                self.assertEqual(extract_response.status_code, 200)
                extracted_contract = extract_response.json()
                self.assertEqual(extracted_contract["title"], "Договор подряда после AI")
                self.assertEqual(extracted_contract["number"], "№ 15/2026")
                self.assertEqual(extracted_contract["amount"], 3100000.0)
                self.assertEqual(extracted_contract["extraction_status"], "review")
                self.assertEqual(len(extracted_contract["milestones"]), 1)
                self.assertEqual(extracted_contract["milestones"][0]["title"], "Выставить второй счет")
