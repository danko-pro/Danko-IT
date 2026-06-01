from __future__ import annotations

import asyncio
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, create_admin_session_token
from supply_bot.config import Settings, load_settings
from supply_bot.estimates.application.flooring_snapshot import BuildFlooringSnapshotUseCase
from tests.admin_projects_routes_case import AdminProjectsRouteCase
from tests.test_public_flooring_snapshot_whitelist import _minimal_covering_kwargs


async def _ensure_f1_global_catalog(repo) -> None:
    covering_titles = ("Керамогранит", "Кварцвинил", "Ламинат", "Ковролин", "Инженерная доска")
    existing_coverings = {row["title"] for row in await repo.list_estimate_flooring_coverings()}
    for title in covering_titles:
        if title not in existing_coverings:
            await repo.create_estimate_flooring_covering(
                **_minimal_covering_kwargs(title=title, underlay_mode="none"),
            )

    existing_preparations = {row["title"] for row in await repo.list_estimate_flooring_preparations()}
    for title, labor, material in (
        ("Без подготовки", 300, 100),
        ("Грунтование", 250, 120),
        ("Наливной пол", 650, 120),
        ("Гидроизоляция", 300, 80),
    ):
        if title not in existing_preparations:
            await repo.create_estimate_flooring_preparation(
                title=title,
                labor_price_per_m2=labor,
                material_price_per_m2=material,
                primer_consumption_per_m2=0,
                primer_unit="л",
                primer_price_per_unit=0,
            )

    existing_layouts = {row["title"] for row in await repo.list_estimate_flooring_layouts()}
    for title, labor, factor, waste in (
        ("Прямая", 1000, 1.1, 5),
        ("Крупный формат", 2000, 1.2, 10),
        ("Клеевая", 800, 1.25, 5),
        ("Плавающая", 1000, 1.0, 3),
    ):
        if title not in existing_layouts:
            await repo.create_estimate_flooring_layout(
                title=title,
                labor_price_per_m2=labor,
                labor_multiplier=factor,
                extra_waste_percent=waste,
            )


class AdminCalculatorFlooringRouteTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-catalog-route-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def _login_admin(self, client: TestClient, *, subject: str = "admin@example.test") -> None:
        client.cookies.clear()
        token, _ = create_admin_session_token(
            self._settings.admin_session_secret or "",
            ttl_seconds=3600,
            subject=subject,
            role="admin",
        )
        client.cookies.set(SESSION_COOKIE_NAME, token)

    def test_non_admin_patch_is_forbidden(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                suffix = uuid4().hex
                register = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"flooring-user-{suffix}@example.test",
                        "password": "password-user",
                        "display_name": "Flooring user",
                    },
                )
                self.assertEqual(register.status_code, 200)

                self.assertEqual(
                    client.patch(
                        "/api/calculator/flooring/coverings/1",
                        json={"title": "Ламинат", "material_price_per_m2": 100},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.patch(
                        "/api/calculator/flooring/preparations/1",
                        json={"title": "Грунтование", "labor_price_per_m2": 100},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.patch(
                        "/api/calculator/flooring/layouts/1",
                        json={"title": "Прямая", "labor_multiplier": 1},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.post(
                        "/api/calculator/flooring/coverings",
                        json=_minimal_covering_kwargs(title="Тест без админа"),
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.post(
                        "/api/calculator/flooring/preparations",
                        json={"title": "Тест без админа", "labor_price_per_m2": 100},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.post(
                        "/api/calculator/flooring/layouts",
                        json={"title": "Тест без админа", "labor_price_per_m2": 100},
                    ).status_code,
                    403,
                )
                self.assertEqual(client.get("/api/calculator/flooring/assembly-items").status_code, 403)
                self.assertEqual(
                    client.post(
                        "/api/calculator/flooring/assembly-items",
                        json={
                            "section": "consumable",
                            "title": "Tile glue",
                            "kind": "consumable",
                            "formula": "kg_layer_consumption",
                        },
                    ).status_code,
                    403,
                )

    def test_flooring_assembly_items_are_db_backed(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)

                seeded = client.get("/api/calculator/flooring/assembly-items")
                self.assertEqual(seeded.status_code, 200)
                seeded_payload = seeded.json()
                self.assertTrue(any(item["source_code"] == "consumable-tile-glue" for item in seeded_payload))

                create = client.post(
                    "/api/calculator/flooring/assembly-items",
                    json={
                        "source_code": "test-glue",
                        "section": "consumable",
                        "title": "Test glue",
                        "kind": "consumable",
                        "formula": "kg_layer_consumption",
                        "unit": "kg",
                        "price": 500,
                        "consumption_per_m2": 1.2,
                        "package_size": 25,
                        "layer_mm": 4,
                        "sort_order": 500,
                    },
                )
                self.assertEqual(create.status_code, 200)
                created = create.json()
                self.assertEqual(created["source_code"], "test-glue")
                self.assertEqual(created["price"], 500)

                patch = client.patch(
                    f"/api/calculator/flooring/assembly-items/{created['id']}",
                    json={
                        "source_code": "test-glue",
                        "section": "consumable",
                        "title": "Test glue updated",
                        "kind": "consumable",
                        "formula": "kg_layer_consumption",
                        "unit": "kg",
                        "price": 650,
                        "consumption_per_m2": 1.5,
                        "package_size": 25,
                        "layer_mm": 5,
                        "sort_order": 500,
                    },
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["title"], "Test glue updated")
                self.assertEqual(patch.json()["price"], 650)

                readback = client.get("/api/calculator/flooring/assembly-items")
                self.assertEqual(readback.status_code, 200)
                self.assertTrue(any(item["title"] == "Test glue updated" for item in readback.json()))

    def test_flooring_assembly_item_validation(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                response = client.post(
                    "/api/calculator/flooring/assembly-items",
                    json={
                        "section": "bad",
                        "title": "Invalid",
                        "kind": "consumable",
                        "formula": "kg_layer_consumption",
                        "price": -1,
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_create_flooring_catalog_rows_are_global_and_snapshot_visible(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            suffix = uuid4().hex
            covering_title = f"Тест покрытие {suffix}"
            preparation_title = f"Тест подготовка {suffix}"
            layout_title = f"Тест укладка {suffix}"

            with self._build_client() as client:
                self._login_admin(client)

                covering = client.post(
                    "/api/calculator/flooring/coverings",
                    json=_minimal_covering_kwargs(
                        title=covering_title,
                        material_price_per_m2=3456,
                        labor_price_per_m2=0,
                        underlay_mode="none",
                    ),
                )
                self.assertEqual(covering.status_code, 200)
                self.assertEqual(covering.json()["title"], covering_title)

                preparation = client.post(
                    "/api/calculator/flooring/preparations",
                    json={
                        "title": preparation_title,
                        "labor_price_per_m2": 456,
                        "material_price_per_m2": 0,
                    },
                )
                self.assertEqual(preparation.status_code, 200)
                self.assertEqual(preparation.json()["title"], preparation_title)

                layout = client.post(
                    "/api/calculator/flooring/layouts",
                    json={
                        "title": layout_title,
                        "labor_price_per_m2": 2345,
                        "labor_multiplier": 1.2,
                        "extra_waste_percent": 7,
                    },
                )
                self.assertEqual(layout.status_code, 200)
                self.assertEqual(layout.json()["title"], layout_title)

                snapshot = client.get("/api/public/catalog/flooring/snapshot")
                self.assertEqual(snapshot.status_code, 200)
                payload = snapshot.json()

                custom_covering = next(item for item in payload["coverings"] if item["title"] == covering_title)
                self.assertEqual(custom_covering["materialPricePerM2"], 3456)
                custom_preparation = next(
                    item for item in payload["preparations"] if item["title"] == preparation_title
                )
                self.assertEqual(custom_preparation["laborPricePerM2"], 456)
                custom_layout = next(item for item in payload["layouts"] if item["title"] == layout_title)
                self.assertEqual(custom_layout["laborPricePerM2"], 2345)
                self.assertEqual(custom_layout["laborFactor"], 1.2)

    def test_duplicate_flooring_catalog_title_returns_conflict(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            title = f"Тест дубль {uuid4().hex}"

            with self._build_client() as client:
                self._login_admin(client)
                first = client.post(
                    "/api/calculator/flooring/coverings",
                    json=_minimal_covering_kwargs(title=title),
                )
                self.assertEqual(first.status_code, 200)

                duplicate = client.post(
                    "/api/calculator/flooring/coverings",
                    json=_minimal_covering_kwargs(title=title),
                )
                self.assertEqual(duplicate.status_code, 409)
                self.assertIn("already exists", duplicate.json()["detail"])

    def test_delete_flooring_catalog_rows_soft_deletes_global_items(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            suffix = uuid4().hex

            with self._build_client() as client:
                self._login_admin(client)

                covering = client.post(
                    "/api/calculator/flooring/coverings",
                    json=_minimal_covering_kwargs(title=f"Удаляемое покрытие {suffix}"),
                ).json()
                preparation = client.post(
                    "/api/calculator/flooring/preparations",
                    json={"title": f"Удаляемая подготовка {suffix}", "labor_price_per_m2": 100},
                ).json()
                layout = client.post(
                    "/api/calculator/flooring/layouts",
                    json={"title": f"Удаляемая укладка {suffix}", "labor_price_per_m2": 100},
                ).json()
                assembly = client.post(
                    "/api/calculator/flooring/assembly-items",
                    json={
                        "source_code": f"delete-test-{suffix}",
                        "section": "work",
                        "title": f"Удаляемый кубик {suffix}",
                        "kind": "work",
                        "formula": "flat_per_m2",
                        "unit": "m2",
                        "price": 100,
                    },
                ).json()

                self.assertEqual(
                    client.delete(f"/api/calculator/flooring/coverings/{covering['id']}").json(),
                    {"id": covering["id"], "deleted": True},
                )
                self.assertEqual(
                    client.delete(f"/api/calculator/flooring/preparations/{preparation['id']}").json(),
                    {"id": preparation["id"], "deleted": True},
                )
                self.assertEqual(
                    client.delete(f"/api/calculator/flooring/layouts/{layout['id']}").json(),
                    {"id": layout["id"], "deleted": True},
                )
                self.assertEqual(
                    client.delete(f"/api/calculator/flooring/assembly-items/{assembly['id']}").json(),
                    {"id": assembly["id"], "deleted": True},
                )

                self.assertFalse(
                    any(item["id"] == covering["id"] for item in client.get("/api/calculator/flooring/coverings").json())
                )
                self.assertFalse(
                    any(
                        item["id"] == preparation["id"]
                        for item in client.get("/api/calculator/flooring/preparations").json()
                    )
                )
                self.assertFalse(
                    any(item["id"] == layout["id"] for item in client.get("/api/calculator/flooring/layouts").json())
                )
                self.assertFalse(
                    any(
                        item["id"] == assembly["id"]
                        for item in client.get("/api/calculator/flooring/assembly-items").json()
                    )
                )

    def test_delete_flooring_catalog_missing_row_returns_not_found(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)

            with self._build_client() as client:
                self._login_admin(client)
                self.assertEqual(client.delete("/api/calculator/flooring/coverings/999999").status_code, 404)

    def test_negative_material_price_is_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)

            async def _create_covering(repo) -> int:
                return await repo.create_estimate_flooring_covering(
                    **_minimal_covering_kwargs(title="Тест отрицательного"),
                )

            with self._build_client() as client:
                global_repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(_create_covering(global_repo))

                self._login_admin(client)
                response = client.patch(
                    f"/api/calculator/flooring/coverings/{covering_id}",
                    json=_minimal_covering_kwargs(title="Тест отрицательного", material_price_per_m2=-1),
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("negative", response.json()["detail"].lower())

    def test_patch_covering_updates_public_snapshot_value(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)

            async def _laminate_id(repo) -> int:
                await _ensure_f1_global_catalog(repo)
                coverings = await repo.list_estimate_flooring_coverings()
                laminate = next(item for item in coverings if item["title"] == "Ламинат")
                return int(laminate["id"])

            async def _laminate_material_from_snapshot(repo) -> float:
                payload = await BuildFlooringSnapshotUseCase(repo).build_public()
                laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
                return float(laminate["materialPricePerM2"])

            with self._build_client() as client:
                global_repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(_laminate_id(global_repo))

                self._login_admin(client)
                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering_id}",
                    json=_minimal_covering_kwargs(
                        title="Ламинат",
                        material_price_per_m2=4321,
                        labor_price_per_m2=5432,
                        underlay_mode="none",
                    ),
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price_per_m2"], 4321)

                material_price = asyncio.run(_laminate_material_from_snapshot(global_repo))
                self.assertEqual(material_price, 4321)
