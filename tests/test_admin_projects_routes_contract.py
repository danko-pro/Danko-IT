from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminProjectsContractRouteTests(AdminProjectsRouteCase):
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
