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


class AdminCalculatorPlumbingRouteTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"plumbing-test-session-secret-{suffix}",
        )
        return TestClient(create_admin_app(settings))

    def test_requires_session_without_cookie(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                # Без валидной сессии каждый mutating/read endpoint каталога — 401.
                self.assertEqual(client.get("/api/calculator/plumbing/catalog-items").status_code, 401)
                self.assertEqual(client.get("/api/calculator/plumbing/zones").status_code, 401)
                self.assertEqual(
                    client.post(
                        "/api/calculator/plumbing/catalog-items",
                        json={
                            "source_code": "work-water-point",
                            "public_title": "Точка ХВС/ГВС",
                            "category": "works",
                            "unit": "шт",
                        },
                    ).status_code,
                    401,
                )
                self.assertEqual(
                    client.get("/api/calculator/plumbing/snapshot/preview").status_code,
                    401,
                )

    def test_invalid_payload_returns_422(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                suffix = uuid4().hex
                register = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"plumbing-422-{suffix}@example.test",
                        "password": "password-422",
                        "display_name": "Plumbing 422",
                    },
                )
                self.assertEqual(register.status_code, 200)

                # Отсутствуют обязательные поля (source_code/public_title/...) → Pydantic 422.
                missing_required = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={"public_title": "Без кода"},
                )
                self.assertEqual(missing_required.status_code, 422)

                # Невалидный тип (число вместо строки/числа) → 422.
                bad_type = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": "x",
                        "public_title": "x",
                        "category": "works",
                        "unit": "шт",
                        "work_price": "not-a-number",
                    },
                )
                self.assertEqual(bad_type.status_code, 422)

                # Состав зоны без обязательного atomic_source_code → 422.
                zone = client.post(
                    "/api/calculator/plumbing/zones",
                    json={"zone_code": "z", "subgroup": "Кухня", "title": "Зона"},
                )
                self.assertEqual(zone.status_code, 200)
                zone_id = int(zone.json()["id"])
                bad_items = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/items",
                    json={"items": [{"quantity": 1}]},
                )
                self.assertEqual(bad_items.status_code, 422)

    def test_crud_roundtrip_snapshot_and_owner_isolation(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                suffix = uuid4().hex
                register_one = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"plumbing-one-{suffix}@example.test",
                        "password": "password-one",
                        "display_name": "Plumbing user one",
                    },
                )
                self.assertEqual(register_one.status_code, 200)
                user_one_cookie = client.cookies.get(SESSION_COOKIE_NAME)

                # CREATE атом
                create_item = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": "work-water-point",
                        "public_title": "Монтаж точки ХВС/ГВС",
                        "technical_title": "Точка водоснабжения (internal)",
                        "category": "works",
                        "unit": "шт",
                        "work_price": 3500,
                        "note": "internal note",
                    },
                )
                self.assertEqual(create_item.status_code, 200)
                item = create_item.json()
                item_id = int(item["id"])
                self.assertEqual(item["source_code"], "work-water-point")
                self.assertNotIn("owner_user_id", item)

                # LIST атомов
                list_items = client.get("/api/calculator/plumbing/catalog-items")
                self.assertEqual(list_items.status_code, 200)
                self.assertIn(item_id, {int(row["id"]) for row in list_items.json()})

                # GET одного атома
                get_item = client.get(f"/api/calculator/plumbing/catalog-items/{item_id}")
                self.assertEqual(get_item.status_code, 200)
                self.assertEqual(get_item.json()["public_title"], "Монтаж точки ХВС/ГВС")

                # PATCH атома
                patch_item = client.patch(
                    f"/api/calculator/plumbing/catalog-items/{item_id}",
                    json={"public_title": "Монтаж точки водоснабжения", "work_price": 3700},
                )
                self.assertEqual(patch_item.status_code, 200)
                self.assertEqual(patch_item.json()["public_title"], "Монтаж точки водоснабжения")
                self.assertEqual(patch_item.json()["work_price"], 3700)

                faucet = client.post(
                    "/api/calculator/plumbing/catalog-items",
                    json={
                        "source_code": "kitchen-faucet-b",
                        "public_title": "Смеситель кухонный B",
                        "category": "equipment",
                        "unit": "шт",
                        "equipment_price": 12000,
                    },
                )
                self.assertEqual(faucet.status_code, 200)
                faucet_id = int(faucet.json()["id"])

                # CREATE зона.
                # Код намеренно отличается от глобальных seed-дефолтов (A5), которые засеваются
                # в lifespan: иначе в снапшоте окажутся две зоны с кодом zone-kitchen-sink.
                zone_code = "zone-roundtrip-test"
                create_zone = client.post(
                    "/api/calculator/plumbing/zones",
                    json={
                        "zone_code": zone_code,
                        "subgroup": "Кухня",
                        "title": "Зона мойки",
                        "risk_percent": 6.4,
                        "active_package_code": "b",
                    },
                )
                self.assertEqual(create_zone.status_code, 200)
                zone = create_zone.json()
                zone_id = int(zone["id"])
                self.assertEqual(zone["base"], [])
                self.assertEqual(zone["packages"], [])

                # LIST зон
                list_zones = client.get("/api/calculator/plumbing/zones")
                self.assertEqual(list_zones.status_code, 200)
                self.assertIn(zone_id, {int(row["id"]) for row in list_zones.json()})

                # PATCH зоны
                patch_zone = client.patch(
                    f"/api/calculator/plumbing/zones/{zone_id}",
                    json={"title": "Зона мойки (изм.)", "risk_percent": 7.0},
                )
                self.assertEqual(patch_zone.status_code, 200)
                self.assertEqual(patch_zone.json()["title"], "Зона мойки (изм.)")

                # PUT состав зоны
                put_items = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/items",
                    json={
                        "items": [
                            {
                                "atomic_item_id": item_id,
                                "atomic_source_code": "work-water-point",
                                "quantity": 1,
                                "coefficient": 1,
                            }
                        ]
                    },
                )
                self.assertEqual(put_items.status_code, 200)
                self.assertEqual(len(put_items.json()["base"]), 1)
                self.assertEqual(put_items.json()["base"][0]["atomic_source_code"], "work-water-point")
                # atomic_item_id резолвится против каталога сантехники (а не потолков, защита от MRO-коллизии).
                self.assertEqual(put_items.json()["base"][0]["atomic_item_id"], item_id)

                # PUT пакеты зоны
                put_packages = client.put(
                    f"/api/calculator/plumbing/zones/{zone_id}/packages",
                    json={
                        "packages": [
                            {
                                "package_code": "b",
                                "label": "Пакет B",
                                "items": [
                                    {
                                        "atomic_item_id": faucet_id,
                                        "atomic_source_code": "kitchen-faucet-b",
                                        "quantity": 1,
                                    }
                                ],
                            }
                        ]
                    },
                )
                self.assertEqual(put_packages.status_code, 200)
                packages = put_packages.json()["packages"]
                self.assertEqual([p["package_code"] for p in packages], ["b"])
                self.assertEqual(packages[0]["items"][0]["atomic_item_id"], faucet_id)

                # GET зоны (детально, с составом и пакетами)
                get_zone = client.get(f"/api/calculator/plumbing/zones/{zone_id}")
                self.assertEqual(get_zone.status_code, 200)
                self.assertEqual(len(get_zone.json()["base"]), 1)
                self.assertEqual(len(get_zone.json()["packages"]), 1)

                # SNAPSHOT preview (internal payload: видны итоги + резерв)
                preview = client.get("/api/calculator/plumbing/snapshot/preview")
                self.assertEqual(preview.status_code, 200)
                preview_payload = preview.json()
                self.assertIn("version", preview_payload)
                self.assertIn("items", preview_payload)
                self.assertIn("zones", preview_payload)
                preview_zone = next(z for z in preview_payload["zones"] if z["code"] == zone_code)
                self.assertIn("riskPercent", preview_zone)
                self.assertEqual(preview_zone["riskPercent"], 7.0)
                preview_package = next(p for p in preview_zone["packages"] if p["code"] == "b")
                self.assertIn("subtotal", preview_package)
                self.assertIn("total", preview_package)

                # Owner-isolation: второй пользователь не видит приватные данные первого.
                register_two = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"plumbing-two-{suffix}@example.test",
                        "password": "password-two",
                        "display_name": "Plumbing user two",
                    },
                )
                self.assertEqual(register_two.status_code, 200)
                self.assertEqual(
                    client.get(f"/api/calculator/plumbing/catalog-items/{item_id}").status_code,
                    404,
                )
                self.assertEqual(client.get(f"/api/calculator/plumbing/zones/{zone_id}").status_code, 404)
                self.assertEqual(
                    client.patch(
                        f"/api/calculator/plumbing/catalog-items/{item_id}",
                        json={"public_title": "Blocked"},
                    ).status_code,
                    404,
                )
                self.assertEqual(
                    client.delete(f"/api/calculator/plumbing/zones/{zone_id}").status_code,
                    404,
                )

                # Возврат первому пользователю: DELETE (soft) атома и зоны.
                client.cookies.set(SESSION_COOKIE_NAME, user_one_cookie)
                delete_item = client.delete(f"/api/calculator/plumbing/catalog-items/{item_id}")
                self.assertEqual(delete_item.status_code, 200)
                self.assertEqual(delete_item.json()["deleted"], True)
                self.assertNotIn(
                    item_id,
                    {int(row["id"]) for row in client.get("/api/calculator/plumbing/catalog-items").json()},
                )

                delete_zone = client.delete(f"/api/calculator/plumbing/zones/{zone_id}")
                self.assertEqual(delete_zone.status_code, 200)
                self.assertEqual(delete_zone.json()["deleted"], True)


if __name__ == "__main__":
    unittest.main()
