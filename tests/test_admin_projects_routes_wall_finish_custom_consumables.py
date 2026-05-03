from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminProjectsWallFinishCustomConsumablesTests(AdminProjectsRouteCase):
    def test_wall_finish_custom_consumables_roundtrip_recalculates_project(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                project_response = client.post("/api/calculator/projects", json={"name": "Wall finish custom smoke"})
                self.assertEqual(project_response.status_code, 200)
                project_id = int(project_response.json()["project"]["id"])

                room_response = client.post(
                    f"/api/calculator/projects/{project_id}/rooms",
                    json={"name": "Room", "ceiling_height_m": 2.7},
                )
                self.assertEqual(room_response.status_code, 200)
                room_id = int(room_response.json()["room"]["id"])

                update_room_response = client.patch(
                    f"/api/calculator/rooms/{room_id}",
                    json={
                        "name": "Room",
                        "ceiling_height_m": 2.7,
                        "manual_floor_area_m2": 12,
                        "auto_perimeter_calc": False,
                        "perimeter_factor": 1.15,
                        "note": "",
                        "walls_m": [4, 3, 4, 3],
                        "floor_sections": [],
                        "openings": [],
                    },
                )
                self.assertEqual(update_room_response.status_code, 200)

                covering_response = client.post(
                    "/api/calculator/wall-finishes/coverings",
                    json={
                        "title": "Wall custom covering",
                        "material_price_per_m2": 500,
                        "labor_price_per_m2": 700,
                        "base_waste_percent": 10,
                        "custom_consumables": [
                            {
                                "title": "Wall additive",
                                "consumption_per_m2": 0.2,
                                "unit": "kg",
                                "price_per_unit": 100,
                            }
                        ],
                    },
                )
                self.assertEqual(covering_response.status_code, 200)
                covering = covering_response.json()
                covering_id = int(covering["id"])
                self.assertIn("Wall additive", covering["custom_consumables_json"])

                wall_finish_response = client.patch(
                    f"/api/calculator/projects/{project_id}/wall-finishes",
                    json={
                        "include_preparation": False,
                        "include_demolition": False,
                        "demolition_price_per_m2": 140,
                        "rooms": [{"room_id": room_id, "selected": True, "covering_id": covering_id}],
                    },
                )
                self.assertEqual(wall_finish_response.status_code, 200)
                wall_finishes = wall_finish_response.json()["wall_finishes"]
                self.assertEqual(wall_finishes["summary"]["rooms_count"], 1)
                self.assertGreater(wall_finishes["rooms"][0]["custom_consumables_cost"], 0)
                self.assertGreater(wall_finishes["summary"]["total_custom_consumables_cost"], 0)
                self.assertIn("Wall additive", {item["title"] for item in wall_finishes["specification"]})
                self.assertAlmostEqual(
                    sum(item["amount"] for item in wall_finishes["specification"]),
                    wall_finishes["summary"]["grand_total"],
                )
