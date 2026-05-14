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
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminCalculatorCeilingsRouteTests(AdminProjectsRouteCase):
    def test_ceiling_routes_roundtrip_and_owner_isolation(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            suffix = uuid4().hex
            settings = replace(
                load_settings(self._create_settings_file(root)),
                admin_session_secret=f"phase7b4-test-session-secret-{suffix}",
            )

            with TestClient(create_admin_app(settings)) as client:
                user_one_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase7b4-user-one-{suffix}@example.test",
                        "password": "password-one",
                        "display_name": "Phase 7B4 user one",
                    },
                )
                self.assertEqual(user_one_response.status_code, 200)
                user_one_cookie = client.cookies.get(SESSION_COOKIE_NAME)

                project_response = client.post(
                    "/api/calculator/projects",
                    json={"name": "Ceiling project"},
                )
                self.assertEqual(project_response.status_code, 200)
                project_payload = project_response.json()
                project_id = int(project_payload["project"]["id"])
                self.assertIn("ceilings", project_payload)
                self.assertEqual(project_payload["ceilings"]["summary"]["items_count"], 0)

                room_response = client.post(
                    f"/api/calculator/projects/{project_id}/rooms",
                    json={
                        "name": "Room",
                        "ceiling_height_m": 2.8,
                        "auto_perimeter_calc": True,
                        "perimeter_factor": 1.1,
                    },
                )
                self.assertEqual(room_response.status_code, 200)
                room_id = int(room_response.json()["room"]["id"])

                empty_payload_response = client.get(f"/api/calculator/projects/{project_id}/ceilings")
                self.assertEqual(empty_payload_response.status_code, 200)
                empty_payload = empty_payload_response.json()
                self.assertEqual(empty_payload["items"], [])
                self.assertEqual(empty_payload["summary"]["grand_total"], 0)

                config_response = client.patch(
                    f"/api/calculator/projects/{project_id}/ceilings/config",
                    json={
                        "default_package_code": "MID",
                        "price_factor": 1.1,
                        "note": "config note",
                    },
                )
                self.assertEqual(config_response.status_code, 200)
                self.assertEqual(config_response.json()["config"]["default_package_code"], "MID")

                catalog_response = client.post(
                    "/api/calculator/ceilings/catalog-items",
                    json={
                        "source_code": "POT-API-001",
                        "title": "API ceiling item",
                        "category": "base",
                        "unit": "m2",
                        "work_price": 100,
                        "material_price": 200,
                        "equipment_price": 300,
                        "consumables_price": 400,
                        "price_factor": 1.2,
                        "quantity_source": "room_area",
                        "quantity_formula": "room.floor_area_m2",
                        "note": "catalog note",
                    },
                )
                self.assertEqual(catalog_response.status_code, 200)
                catalog_item = catalog_response.json()
                catalog_item_id = int(catalog_item["id"])

                catalog_update_response = client.patch(
                    f"/api/calculator/ceilings/catalog-items/{catalog_item_id}",
                    json={"title": "API ceiling item updated", "work_price": 110},
                )
                self.assertEqual(catalog_update_response.status_code, 200)
                self.assertEqual(catalog_update_response.json()["title"], "API ceiling item updated")

                rooms_response = client.put(
                    f"/api/calculator/projects/{project_id}/ceilings/rooms",
                    json={
                        "rooms": [
                            {
                                "room_id": room_id,
                                "default_catalog_item_id": catalog_item_id,
                                "is_enabled": True,
                                "ceiling_area_m2": 18.5,
                                "area_source": "manual",
                                "perimeter_m": 17.2,
                                "perimeter_source": "manual",
                                "package_code_snapshot": "MID",
                                "note": "room ceiling note",
                            }
                        ]
                    },
                )
                self.assertEqual(rooms_response.status_code, 200)
                ceiling_room = rooms_response.json()["rooms"][0]
                self.assertTrue(ceiling_room["selected"])
                self.assertEqual(ceiling_room["default_catalog_item_id"], catalog_item_id)

                create_item_response = client.post(
                    f"/api/calculator/projects/{project_id}/ceilings/items",
                    json={
                        "room_id": room_id,
                        "source_catalog_item_id": catalog_item_id,
                        "source_code_snapshot": "POT-API-001",
                        "title_snapshot": "API ceiling snapshot",
                        "category_snapshot": "base",
                        "unit_snapshot": "m2",
                        "quantity": 10,
                        "quantity_source": "room_area",
                        "quantity_formula_snapshot": "room.floor_area_m2",
                        "work_price_snapshot": 100,
                        "material_price_snapshot": 200,
                        "equipment_price_snapshot": 300,
                        "consumables_price_snapshot": 400,
                        "price_factor_snapshot": 1.2,
                        "work_total": 1200,
                        "material_total": 2400,
                        "equipment_total": 3600,
                        "consumables_total": 4800,
                        "total": 12000,
                        "note_snapshot": "snapshot note",
                        "is_enabled": True,
                    },
                )
                self.assertEqual(create_item_response.status_code, 200)
                create_item_payload = create_item_response.json()
                self.assertEqual(create_item_payload["summary"]["items_count"], 1)
                self.assertEqual(create_item_payload["summary"]["grand_total"], 12000)
                item_id = int(create_item_payload["items"][0]["id"])

                update_item_response = client.patch(
                    f"/api/calculator/ceilings/items/{item_id}",
                    json={
                        "project_id": project_id,
                        "room_id": room_id,
                        "source_catalog_item_id": catalog_item_id,
                        "source_code_snapshot": "POT-API-001",
                        "title_snapshot": "API ceiling snapshot updated",
                        "category_snapshot": "base",
                        "unit_snapshot": "m2",
                        "quantity": 5,
                        "quantity_source": "manual",
                        "quantity_formula_snapshot": "manual",
                        "work_price_snapshot": 100,
                        "material_price_snapshot": 200,
                        "equipment_price_snapshot": 300,
                        "consumables_price_snapshot": 400,
                        "price_factor_snapshot": 1,
                        "work_total": 500,
                        "material_total": 1000,
                        "equipment_total": 1500,
                        "consumables_total": 2000,
                        "total": 5000,
                        "note_snapshot": "updated snapshot note",
                        "is_enabled": True,
                    },
                )
                self.assertEqual(update_item_response.status_code, 200)
                update_item_payload = update_item_response.json()
                self.assertEqual(update_item_payload["items"][0]["title_snapshot"], "API ceiling snapshot updated")
                self.assertEqual(update_item_payload["summary"]["grand_total"], 5000)

                project_detail_response = client.get(f"/api/calculator/projects/{project_id}")
                self.assertEqual(project_detail_response.status_code, 200)
                project_detail = project_detail_response.json()
                self.assertIn("ceilings", project_detail)
                self.assertEqual(project_detail["ceilings"]["items"][0]["id"], item_id)
                self.assertEqual(project_detail["ceilings"]["specification"][0]["total"], 5000)

                user_two_response = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"phase7b4-user-two-{suffix}@example.test",
                        "password": "password-two",
                        "display_name": "Phase 7B4 user two",
                    },
                )
                self.assertEqual(user_two_response.status_code, 200)
                self.assertEqual(client.get(f"/api/calculator/projects/{project_id}/ceilings").status_code, 404)

                user_two_project_response = client.post(
                    "/api/calculator/projects",
                    json={"name": "User two ceiling project"},
                )
                self.assertEqual(user_two_project_response.status_code, 200)
                user_two_project_id = int(user_two_project_response.json()["project"]["id"])
                user_two_ceiling_payload = client.get(f"/api/calculator/projects/{user_two_project_id}/ceilings")
                self.assertEqual(user_two_ceiling_payload.status_code, 200)
                user_two_catalog_ids = {int(item["id"]) for item in user_two_ceiling_payload.json()["catalog_items"]}
                self.assertNotIn(catalog_item_id, user_two_catalog_ids)
                self.assertEqual(client.delete(f"/api/calculator/ceilings/items/{item_id}").status_code, 404)

                client.cookies.set(SESSION_COOKIE_NAME, user_one_cookie)
                delete_response = client.delete(f"/api/calculator/ceilings/items/{item_id}")
                self.assertEqual(delete_response.status_code, 200)
                self.assertEqual(delete_response.json()["items"], [])
                self.assertEqual(delete_response.json()["summary"]["grand_total"], 0)


if __name__ == "__main__":
    unittest.main()
