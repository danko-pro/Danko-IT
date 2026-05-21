from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminProjectsCrudRouteTests(AdminProjectsRouteCase):
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
                        "address": "Москва, Проспект Мира, 42",
                        "entrance_section": "2 / Б",
                        "apartment": "17",
                        "floor": "8",
                        "room_count": 4,
                        "site_access": "По пропуску",
                        "access_hours": "09:00-19:00",
                        "intercom_code": "4258",
                        "responsible_person": "Даниил",
                        "comment": "Въезд через охрану, разгрузку согласовывать за час.",
                        "ceiling_height_m": 2.9,
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
                self.assertEqual(project["entrance_section"], "2 / Б")
                self.assertEqual(project["room_count"], 4)
                self.assertEqual(project["access_hours"], "09:00-19:00")
                self.assertEqual(project["comment"], "Въезд через охрану, разгрузку согласовывать за час.")
                self.assertEqual(project["ceiling_height_m"], 2.9)
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
                        "entrance_section": "3 / А",
                        "room_count": 5,
                        "access_hours": "10:00-18:00",
                        "comment": "Новый режим доступа для бригады.",
                        "ceiling_height_m": 3.05,
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
                self.assertEqual(updated["entrance_section"], "3 / А")
                self.assertEqual(updated["room_count"], 5)
                self.assertEqual(updated["access_hours"], "10:00-18:00")
                self.assertEqual(updated["comment"], "Новый режим доступа для бригады.")
                self.assertEqual(updated["ceiling_height_m"], 3.05)
                self.assertEqual(updated["code"], "ИБ / 22А")
                self.assertEqual(updated["name"], "Объект ИБ, этап 2")
                self.assertEqual(updated["stage_tone"], "warn")
                self.assertEqual(updated["remaining_total"], 700000.0)
                self.assertEqual(updated["next_delivery_label"], "20.04")

                detail_response = client.get(f"/api/projects/{project_id}")
                self.assertEqual(detail_response.status_code, 200)
                detail_payload = detail_response.json()
                self.assertEqual(detail_payload["id"], project_id)
                self.assertEqual(detail_payload["remaining_total"], 700000.0)
                self.assertIn("finance_summary", detail_payload)
                self.assertEqual(detail_payload["finance_summary"]["tax_rate_percent"], 0.0)
                self.assertEqual(detail_payload["finance_summary"]["tax_base"], detail_payload["received_total"])

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
