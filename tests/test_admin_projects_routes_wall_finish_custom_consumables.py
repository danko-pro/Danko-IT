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

    def test_wall_finish_zones_roundtrip_recalculates_project(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                project_response = client.post("/api/calculator/projects", json={"name": "Wall finish zone smoke"})
                self.assertEqual(project_response.status_code, 200)
                project_id = int(project_response.json()["project"]["id"])

                room_response = client.post(
                    f"/api/calculator/projects/{project_id}/rooms",
                    json={"name": "Bathroom", "ceiling_height_m": 2.7},
                )
                self.assertEqual(room_response.status_code, 200)
                room_id = int(room_response.json()["room"]["id"])

                update_room_response = client.patch(
                    f"/api/calculator/rooms/{room_id}",
                    json={
                        "name": "Bathroom",
                        "ceiling_height_m": 2.7,
                        "manual_floor_area_m2": 6,
                        "auto_perimeter_calc": False,
                        "perimeter_factor": 1.15,
                        "note": "",
                        "walls_m": [2, 3, 2, 3],
                        "floor_sections": [],
                        "openings": [],
                    },
                )
                self.assertEqual(update_room_response.status_code, 200)

                paint_response = client.post(
                    "/api/calculator/wall-finishes/coverings",
                    json={"title": "Zone paint", "material_price_per_m2": 400, "labor_price_per_m2": 500},
                )
                self.assertEqual(paint_response.status_code, 200)
                paint_id = int(paint_response.json()["id"])

                tile_response = client.post(
                    "/api/calculator/wall-finishes/coverings",
                    json={
                        "title": "Zone wall tile",
                        "material_price_per_m2": 1400,
                        "labor_price_per_m2": 1200,
                        "base_waste_percent": 8,
                        "glue_consumption_per_m2": 0.4,
                        "glue_unit": "kg",
                        "glue_price_per_unit": 180,
                    },
                )
                self.assertEqual(tile_response.status_code, 200)
                tile_id = int(tile_response.json()["id"])

                wall_finish_response = client.patch(
                    f"/api/calculator/projects/{project_id}/wall-finishes",
                    json={
                        "include_preparation": False,
                        "include_demolition": False,
                        "demolition_price_per_m2": 140,
                        "rooms": [
                            {
                                "room_id": room_id,
                                "selected": True,
                                "covering_id": paint_id,
                                "zones": [
                                    {"covering_id": paint_id, "area_m2": 12, "note": "painted walls"},
                                    {"covering_id": tile_id, "area_m2": 8, "note": "tile wet zone"},
                                ],
                            }
                        ],
                    },
                )
                self.assertEqual(wall_finish_response.status_code, 200)
                wall_finishes = wall_finish_response.json()["wall_finishes"]
                room = wall_finishes["rooms"][0]
                self.assertEqual(len(room["zones"]), 2)
                self.assertEqual(room["zones"][1]["covering_title"], "Zone wall tile")
                self.assertGreater(room["zones"][1]["total_cost"], room["zones"][0]["total_cost"])
                self.assertGreater(wall_finishes["summary"]["grand_total"], 0)
                self.assertIn("Zone wall tile", {item["title"] for item in wall_finishes["specification"]})
                self.assertAlmostEqual(
                    sum(item["amount"] for item in wall_finishes["specification"]),
                    wall_finishes["summary"]["grand_total"],
                )

                invalid_area_response = client.patch(
                    f"/api/calculator/projects/{project_id}/wall-finishes",
                    json={
                        "include_preparation": False,
                        "include_demolition": False,
                        "demolition_price_per_m2": 140,
                        "rooms": [
                            {
                                "room_id": room_id,
                                "selected": True,
                                "covering_id": paint_id,
                                "zones": [
                                    {"covering_id": paint_id, "area_m2": 99},
                                ],
                            }
                        ],
                    },
                )
                self.assertEqual(invalid_area_response.status_code, 400)
                self.assertEqual(invalid_area_response.json()["detail"], "Wall finish zones cannot exceed room area")
