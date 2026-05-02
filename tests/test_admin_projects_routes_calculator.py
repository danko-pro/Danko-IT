from __future__ import annotations

import sqlite3
from contextlib import closing
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class AdminProjectsCalculatorRouteTests(AdminProjectsRouteCase):
    def test_legacy_estimate_project_schema_migrates_passport_columns(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with closing(sqlite3.connect(settings.database_path)) as db:
                db.execute(
                    """
                    CREATE TABLE estimate_projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        note TEXT,
                        group_chat_id INTEGER,
                        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
                db.execute("INSERT INTO estimate_projects (name) VALUES (?)", ("Legacy project",))
                db.commit()

            with TestClient(create_admin_app(settings)) as client:
                response = client.get("/api/calculator/projects")

            self.assertEqual(response.status_code, 200)
            projects = response.json()
            self.assertEqual(projects[0]["name"], "Legacy project")
            self.assertEqual(projects[0]["address"], "")
            self.assertEqual(projects[0]["apartment"], "")
            self.assertFalse(projects[0]["has_elevator"])

    def test_calculator_routes_roundtrip(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post(
                    "/api/calculator/projects",
                    json={
                        "name": "Квартира А",
                        "note": "Тестовый проект калькулятора",
                    },
                )
                self.assertEqual(create_project_response.status_code, 200)
                created_project = create_project_response.json()
                project_id = int(created_project["project"]["id"])
                self.assertEqual(created_project["project"]["name"], "Квартира А")

                update_project_response = client.patch(
                    f"/api/calculator/projects/{project_id}",
                    json={
                        "name": "Project A Updated",
                        "residential_complex": "RC One",
                        "address": "Main street 10",
                        "entrance_section": "Section B",
                        "apartment": "45",
                        "floor": "12",
                        "lift_type": "cargo",
                        "site_access": "Call guard",
                        "intercom_code": "4512",
                        "loading_zone": "Yard gate",
                        "responsible_person": "Site manager",
                        "note": "Updated from autosave",
                    },
                )
                self.assertEqual(update_project_response.status_code, 200)
                updated_project = update_project_response.json()
                self.assertEqual(updated_project["project"]["name"], "Project A Updated")
                self.assertEqual(updated_project["project"]["residential_complex"], "RC One")
                self.assertEqual(updated_project["project"]["lift_type"], "cargo")
                self.assertEqual(updated_project["project"]["loading_zone"], "Yard gate")

                create_room_response = client.post(
                    f"/api/calculator/projects/{project_id}/rooms",
                    json={
                        "name": "Кухня",
                        "ceiling_height_m": 2.8,
                        "auto_perimeter_calc": True,
                        "perimeter_factor": 1.1,
                    },
                )
                self.assertEqual(create_room_response.status_code, 200)
                room_id = int(create_room_response.json()["room"]["id"])

                update_room_response = client.patch(
                    f"/api/calculator/rooms/{room_id}",
                    json={
                        "name": "Кухня-гостиная",
                        "ceiling_height_m": 2.85,
                        "manual_floor_area_m2": 22.5,
                        "auto_perimeter_calc": True,
                        "perimeter_factor": 1.12,
                        "note": "Основное помещение",
                        "walls_m": [4.2, 5.1, 4.2, 5.1],
                        "floor_sections": [{"length_m": 4.5, "width_m": 5.0}],
                        "openings": [],
                    },
                )
                self.assertEqual(update_room_response.status_code, 200)
                updated_room = update_room_response.json()
                self.assertEqual(updated_room["room"]["name"], "Кухня-гостиная")
                self.assertEqual(updated_room["stats"]["floor_area_m2"], 22.5)

                warm_floor_response = client.patch(
                    f"/api/calculator/projects/{project_id}/warm-floor",
                    json={
                        "work_price_per_m2": 1650,
                        "pipe_m_per_m2": 6.2,
                        "max_contour_area_m2": 14,
                        "small_zone_area_m2": 4,
                        "manifold_work_price": 6500,
                        "manifold_material_price": 21000,
                        "pump_work_price": 8200,
                        "pump_material_price": 25500,
                        "pipe_price_per_m": 175,
                        "pump_rooms_threshold": 3,
                        "pump_contours_threshold": 4,
                        "rooms": [
                            {
                                "room_id": room_id,
                                "selected": True,
                                "area_m2_override": 20.0,
                            }
                        ],
                    },
                )
                self.assertEqual(warm_floor_response.status_code, 200)
                self.assertEqual(warm_floor_response.json()["warm_floor"]["summary"]["rooms_count"], 1)

                flooring_covering_response = client.post(
                    "/api/calculator/flooring/coverings",
                    json={"title": "Керамогранит Тест 01"},
                )
                self.assertEqual(flooring_covering_response.status_code, 200)
                flooring_covering_id = int(flooring_covering_response.json()["id"])

                flooring_response = client.patch(
                    f"/api/calculator/projects/{project_id}/flooring",
                    json={
                        "include_underlay": False,
                        "include_plinth": True,
                        "include_demolition": False,
                        "include_preparation": False,
                        "demolition_price_per_m2": 150,
                        "underlay_price_per_m2": 120,
                        "plinth_material_price_per_m": 180,
                        "plinth_install_price_per_m": 250,
                        "threshold_profile_count": 1,
                        "threshold_profile_price": 900,
                        "rooms": [
                            {
                                "room_id": room_id,
                                "selected": True,
                                "covering_id": flooring_covering_id,
                                "perimeter_m_override": 18,
                                "plinth_m_override": 18,
                            }
                        ],
                    },
                )
                self.assertEqual(flooring_response.status_code, 200)
                flooring = flooring_response.json()["flooring"]
                self.assertEqual(flooring["summary"]["rooms_count"], 1)
                flooring_spec_total = sum(item["amount"] for item in flooring["specification"])
                self.assertAlmostEqual(flooring_spec_total, flooring["summary"]["grand_total"])

                wall_finish_covering_response = client.post(
                    "/api/calculator/wall-finishes/coverings",
                    json={"title": "Краска Тест 01"},
                )
                self.assertEqual(wall_finish_covering_response.status_code, 200)
                wall_finish_covering_id = int(wall_finish_covering_response.json()["id"])

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
                                "covering_id": wall_finish_covering_id,
                            }
                        ],
                    },
                )
                self.assertEqual(wall_finish_response.status_code, 200)
                self.assertEqual(wall_finish_response.json()["wall_finishes"]["summary"]["rooms_count"], 1)

                door_catalog_response = client.post(
                    "/api/calculator/door-catalog",
                    json={
                        "title": "Межкомнатная дверь Тест 01",
                        "width_mm": 800,
                        "height_mm": 2000,
                    },
                )
                self.assertEqual(door_catalog_response.status_code, 200)
                door_catalog_id = int(door_catalog_response.json()["id"])

                component_catalog_response = client.post(
                    "/api/calculator/door-component-catalog",
                    json={
                        "category_code": "lock",
                        "title": "Замок Тест 01",
                    },
                )
                self.assertEqual(component_catalog_response.status_code, 200)
                component_catalog_id = int(component_catalog_response.json()["id"])

                create_door_response = client.post(
                    f"/api/calculator/projects/{project_id}/doors",
                    json={
                        "door_catalog_id": door_catalog_id,
                        "room_a_id": room_id,
                    },
                )
                self.assertEqual(create_door_response.status_code, 200)
                created_door_project = create_door_response.json()
                self.assertEqual(len(created_door_project["doors"]), 1)
                door_id = int(created_door_project["doors"][0]["id"])

                create_component_response = client.post(
                    f"/api/calculator/project-doors/{door_id}/components",
                    json={
                        "component_catalog_id": component_catalog_id,
                        "quantity": 1,
                    },
                )
                self.assertEqual(create_component_response.status_code, 200)
                created_component_project = create_component_response.json()
                self.assertEqual(len(created_component_project["doors"][0]["components"]), 1)

    def test_room_geometry_clamps_negative_values_and_zero_quantity(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(self._create_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                create_project_response = client.post("/api/calculator/projects", json={"name": "Test"})
                self.assertEqual(create_project_response.status_code, 200)
                project_id = int(create_project_response.json()["project"]["id"])

                create_room_response = client.post(
                    f"/api/calculator/projects/{project_id}/rooms",
                    json={"name": "Room"},
                )
                self.assertEqual(create_room_response.status_code, 200)
                room_id = int(create_room_response.json()["room"]["id"])

                update_room_response = client.patch(
                    f"/api/calculator/rooms/{room_id}",
                    json={
                        "name": "Room",
                        "ceiling_height_m": 2.7,
                        "manual_floor_area_m2": None,
                        "auto_perimeter_calc": False,
                        "perimeter_factor": 1.15,
                        "note": "",
                        "walls_m": [3, -2],
                        "floor_sections": [
                            {"length_m": 2, "width_m": 3},
                            {"length_m": -4, "width_m": 5},
                        ],
                        "openings": [
                            {
                                "opening_type": "window",
                                "width_m": 1,
                                "height_m": 2,
                                "quantity": 0,
                                "area_m2": None,
                                "note": "",
                            },
                            {
                                "opening_type": "window",
                                "width_m": None,
                                "height_m": None,
                                "quantity": 1,
                                "area_m2": -5,
                                "note": "",
                            },
                        ],
                    },
                )
                self.assertEqual(update_room_response.status_code, 200)
                updated_room = update_room_response.json()
                self.assertEqual(updated_room["stats"]["floor_area_m2"], 6)
                self.assertEqual(updated_room["stats"]["perimeter_m"], 3)
                self.assertEqual(updated_room["stats"]["openings_area_m2"], 0)
                self.assertAlmostEqual(updated_room["stats"]["wall_area_gross_m2"], 8.1)
                self.assertAlmostEqual(updated_room["stats"]["wall_area_net_m2"], 8.1)
