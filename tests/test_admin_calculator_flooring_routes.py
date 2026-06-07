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
from supply_bot.estimates.application.flooring_catalog_assembly import FLOORING_FLAT_CATALOG_CREATE_BLOCKED
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
                self.assertEqual(
                    client.get("/api/calculator/flooring/covering/1/assembly").status_code,
                    403,
                )
                self.assertEqual(
                    client.put(
                        "/api/calculator/flooring/covering/1/assembly",
                        json={"title": "Test", "rows": []},
                    ).status_code,
                    403,
                )
                self.assertEqual(
                    client.delete("/api/calculator/flooring/covering/1/assembly").status_code,
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

                covering_rows = [
                    _assembly_row(
                        title=covering_title,
                        public_title=covering_title,
                        price=3456,
                        consumption_per_m2=1,
                    ),
                    _assembly_row(
                        section="consumable",
                        kind="consumable",
                        formula="package_consumption",
                        title="Грунт",
                        public_title="Грунт",
                        unit="l",
                        price=2500,
                        consumption_per_m2=0.1,
                        package_size=10,
                        public_category="consumables",
                        sort_order=20,
                    ),
                    _assembly_row(
                        section="tool",
                        kind="tool",
                        formula="flat_per_m2",
                        title="Tool consumables",
                        public_title="Tool consumables",
                        unit="m2",
                        price=40,
                        consumption_per_m2=1,
                        public_category="tools",
                        sort_order=30,
                    ),
                ]
                covering = _post_covering_from_assembly(
                    client,
                    covering_title,
                    covering_rows,
                    material_price_per_m2=3456,
                    labor_price_per_m2=0,
                    underlay_mode="none",
                )
                self.assertEqual(covering.status_code, 200)
                self.assertEqual(covering.json()["title"], covering_title)

                preparation = client.post(
                    "/api/calculator/flooring/preparations/from-assembly",
                    json={
                        "catalog": {
                            "title": preparation_title,
                            "labor_price_per_m2": 456,
                            "material_price_per_m2": 0,
                        },
                        "assembly": {
                            "title": preparation_title,
                            "rows": [
                                _assembly_row(
                                    section="work",
                                    kind="work",
                                    title=preparation_title,
                                    public_title=preparation_title,
                                    price=456,
                                    consumption_per_m2=1,
                                    public_category="works",
                                )
                            ],
                        },
                    },
                )
                self.assertEqual(preparation.status_code, 200)

                layout = client.post(
                    "/api/calculator/flooring/layouts/from-assembly",
                    json={
                        "catalog": {
                            "title": layout_title,
                            "labor_price_per_m2": 2345,
                            "labor_multiplier": 1.2,
                            "extra_waste_percent": 7,
                        },
                        "assembly": {
                            "title": layout_title,
                            "rows": [
                                _assembly_row(
                                    section="work",
                                    kind="work",
                                    title=layout_title,
                                    public_title=layout_title,
                                    price=2345,
                                    consumption_per_m2=1.2,
                                    public_category="works",
                                )
                            ],
                        },
                    },
                )
                self.assertEqual(layout.status_code, 200)

                snapshot = client.get("/api/public/catalog/flooring/snapshot")
                self.assertEqual(snapshot.status_code, 200)
                payload = snapshot.json()

                custom_covering = next(item for item in payload["coverings"] if item["title"] == covering_title)
                self.assertEqual(custom_covering["materialPricePerM2"], 3456)
                self.assertIn("specLines", custom_covering)
                custom_preparation = next(
                    item for item in payload["preparations"] if item["title"] == preparation_title
                )
                self.assertEqual(custom_preparation["laborPricePerM2"], 456)
                self.assertIn("specLines", custom_preparation)
                custom_layout = next(item for item in payload["layouts"] if item["title"] == layout_title)
                self.assertEqual(custom_layout["laborPricePerM2"], 2814)
                self.assertEqual(custom_layout["laborFactor"], 1.2)
                self.assertIn("specLines", custom_layout)

    def test_duplicate_flooring_catalog_title_returns_conflict(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            title = f"Тест дубль {uuid4().hex}"

            with self._build_client() as client:
                self._login_admin(client)
                first = _post_covering_from_assembly(
                    client,
                    title,
                    [_assembly_row(title=title, public_title=title)],
                )
                self.assertEqual(first.status_code, 200)

                duplicate = _post_covering_from_assembly(
                    client,
                    title,
                    [_assembly_row(title=title, public_title=title, price=1)],
                )
                self.assertEqual(duplicate.status_code, 409)
                self.assertIn("already exists", duplicate.json()["detail"])

    def test_delete_flooring_catalog_rows_soft_deletes_global_items(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            suffix = uuid4().hex

            with self._build_client() as client:
                self._login_admin(client)

                covering = {
                    "id": _repo_create_covering(
                        client.app.state.estimate_repository.for_owner(None), title=f"Удаляемое покрытие {suffix}"
                    )
                }
                preparation = {
                    "id": _repo_create_preparation(
                        client.app.state.estimate_repository.for_owner(None), f"Удаляемая подготовка {suffix}"
                    )
                }
                layout = {
                    "id": _repo_create_layout(
                        client.app.state.estimate_repository.for_owner(None), f"Удаляемая укладка {suffix}"
                    )
                }
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
                    any(
                        item["id"] == covering["id"] for item in client.get("/api/calculator/flooring/coverings").json()
                    )
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
                assembly_path = f"/api/calculator/flooring/covering/{covering_id}/assembly"
                existing = client.get(assembly_path)
                self.assertEqual(existing.status_code, 200)
                rows = existing.json().get("rows") or []
                material_rows = [row for row in rows if row.get("kind") == "material"]
                self.assertGreaterEqual(len(material_rows), 1)
                material_rows[0]["price"] = 4321
                material_rows[0]["consumption_per_m2"] = 1

                put = client.put(
                    assembly_path,
                    json={
                        "title": existing.json()["title"] or "Ламинат (технический пакет PF2)",
                        "rows": rows
                        if rows
                        else [_assembly_row(price=4321, consumption_per_m2=1, public_title="Ламинат")],
                    },
                )
                self.assertEqual(put.status_code, 200)
                self.assertEqual(put.json()["rows"][0]["price"], 4321)

                material_price = asyncio.run(_laminate_material_from_snapshot(global_repo))
                self.assertEqual(material_price, 4321)


def _repo_create_covering(repo, title: str) -> int:
    return asyncio.run(
        repo.create_estimate_flooring_covering(**_minimal_covering_kwargs(title=title)),
    )


def _repo_create_preparation(repo, title: str) -> int:
    return asyncio.run(
        repo.create_estimate_flooring_preparation(
            title=title,
            labor_price_per_m2=100,
            material_price_per_m2=0,
            primer_consumption_per_m2=0,
            primer_unit="л",
            primer_price_per_unit=0,
        ),
    )


def _repo_create_layout(repo, title: str) -> int:
    return asyncio.run(
        repo.create_estimate_flooring_layout(
            title=title,
            labor_price_per_m2=100,
            labor_multiplier=1,
            extra_waste_percent=0,
        ),
    )


def _from_assembly_covering_body(
    title: str, rows: list[dict[str, object]], **catalog_overrides: object
) -> dict[str, object]:
    return {
        "catalog": _minimal_covering_kwargs(title=title, **catalog_overrides),
        "assembly": {"title": title, "rows": rows},
    }


def _post_covering_from_assembly(
    client: TestClient, title: str, rows: list[dict[str, object]], **catalog_overrides: object
):
    return client.post(
        "/api/calculator/flooring/coverings/from-assembly",
        json=_from_assembly_covering_body(title, rows, **catalog_overrides),
    )


def _assembly_row(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "section": "covering",
        "kind": "material",
        "formula": "flat_per_m2",
        "title": "Керамогранит",
        "unit": "m2",
        "price": 1200,
        "consumption_per_m2": 1,
        "sort_order": 10,
        "is_enabled": True,
        "public_category": "materials",
    }
    values.update(overrides)
    return values


class AdminCalculatorFlooringCatalogAssemblyRouteTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-assembly-route-secret-{suffix}",
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

    def test_get_missing_assembly_returns_empty_payload(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"Assembly empty {uuid4().hex}")
                    )
                )

                response = client.get(f"/api/calculator/flooring/covering/{covering_id}/assembly")
                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["target_kind"], "covering")
                self.assertEqual(payload["target_id"], covering_id)
                self.assertEqual(payload["title"], "")
                self.assertEqual(payload["version"], "flooring-assembly-v1")
                self.assertEqual(payload["rows"], [])

    def test_put_and_get_covering_assembly_with_allowed_rows(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"Assembly save {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}

                put = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Состав покрытия",
                        "rows": [
                            _assembly_row(kind="material", public_category="materials"),
                            _assembly_row(
                                kind="consumable",
                                title="Клей",
                                public_category="consumables",
                                section="consumable",
                            ),
                            _assembly_row(
                                kind="tool",
                                title="Инструмент",
                                public_category="tools",
                                section="tool",
                                formula="fixed_area_allocation",
                                unit="pcs",
                                price=500,
                                consumption_per_m2=0,
                            ),
                        ],
                    },
                )
                self.assertEqual(put.status_code, 200)
                saved = put.json()
                self.assertEqual(saved["title"], "Состав покрытия")
                self.assertEqual(len(saved["rows"]), 3)
                kinds = {row["kind"] for row in saved["rows"]}
                self.assertEqual(kinds, {"material", "consumable", "tool"})

                readback = client.get(f"/api/calculator/flooring/covering/{covering['id']}/assembly")
                self.assertEqual(readback.status_code, 200)
                self.assertEqual(readback.json()["title"], "Состав покрытия")
                self.assertEqual(len(readback.json()["rows"]), 3)

    def test_put_covering_with_work_row_is_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"Assembly work reject {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}

                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Bad covering assembly",
                        "rows": [
                            _assembly_row(
                                kind="work",
                                section="work",
                                public_category="works",
                                formula="flat_per_m2",
                            )
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_preparation_with_non_work_row_is_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                preparation = {
                    "id": _repo_create_preparation(
                        client.app.state.estimate_repository.for_owner(None), f"Assembly prep {uuid4().hex}"
                    )
                }

                response = client.put(
                    f"/api/calculator/flooring/preparation/{preparation['id']}/assembly",
                    json={
                        "title": "Bad preparation assembly",
                        "rows": [_assembly_row(kind="material", public_category="materials")],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_layout_with_non_work_row_is_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                layout = {
                    "id": _repo_create_layout(
                        client.app.state.estimate_repository.for_owner(None), f"Assembly layout {uuid4().hex}"
                    )
                }

                response = client.put(
                    f"/api/calculator/flooring/layout/{layout['id']}/assembly",
                    json={
                        "title": "Bad layout assembly",
                        "rows": [_assembly_row(kind="consumable", public_category="consumables", section="consumable")],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_invalid_target_kind_is_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                response = client.put(
                    "/api/calculator/flooring/invalid/1/assembly",
                    json={"title": "Bad kind", "rows": []},
                )
                self.assertEqual(response.status_code, 400)

    def test_put_unknown_target_id_returns_not_found(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                response = client.put(
                    "/api/calculator/flooring/covering/999999/assembly",
                    json={"title": "Missing target", "rows": []},
                )
                self.assertEqual(response.status_code, 404)

    def test_delete_assembly_then_get_returns_empty(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"Assembly delete {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                path = f"/api/calculator/flooring/covering/{covering['id']}/assembly"

                put = client.put(
                    path,
                    json={"title": "To delete", "rows": [_assembly_row()]},
                )
                self.assertEqual(put.status_code, 200)

                deleted = client.delete(path)
                self.assertEqual(deleted.status_code, 200)
                self.assertEqual(deleted.json()["deleted"], True)

                readback = client.get(path)
                self.assertEqual(readback.status_code, 200)
                self.assertEqual(readback.json()["rows"], [])
                self.assertEqual(readback.json()["title"], "")

    def test_put_assembly_syncs_covering_flat_material_rate(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"FP3b covering {uuid4().hex}",
                            material_price_per_m2=50,
                        )
                    )
                )
                covering = {"id": covering_id}

                put = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Состав",
                        "rows": [
                            _assembly_row(
                                kind="material",
                                public_category="materials",
                                price=2000,
                                consumption_per_m2=1.1,
                                public_title="Керамогранит",
                            ),
                        ],
                    },
                )
                self.assertEqual(put.status_code, 200)

                patched = client.get("/api/calculator/flooring/coverings").json()
                saved = next(item for item in patched if item["id"] == covering["id"])
                self.assertEqual(saved["material_price_per_m2"], 2200)

    def test_put_assembly_syncs_preparation_work_flat(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                preparation = {
                    "id": _repo_create_preparation(
                        client.app.state.estimate_repository.for_owner(None), f"FP3b prep {uuid4().hex}"
                    )
                }

                put = client.put(
                    f"/api/calculator/flooring/preparation/{preparation['id']}/assembly",
                    json={
                        "title": "Подготовка",
                        "rows": [
                            _assembly_row(
                                section="work",
                                kind="work",
                                formula="flat_per_m2",
                                public_category="works",
                                public_title="Выравнивание",
                                title="Выравнивание",
                                price=900,
                                consumption_per_m2=1.2,
                            ),
                        ],
                    },
                )
                self.assertEqual(put.status_code, 200)

                saved = client.get("/api/calculator/flooring/preparations").json()
                row = next(item for item in saved if item["id"] == preparation["id"])
                self.assertEqual(row["labor_price_per_m2"], 1080)
                self.assertEqual(row["material_price_per_m2"], 0)

    def test_put_invalid_assembly_kind_leaves_flat_unchanged(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"FP3b reject {uuid4().hex}",
                            material_price_per_m2=333,
                        )
                    )
                )
                covering = {"id": covering_id}

                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Bad",
                        "rows": [
                            _assembly_row(
                                kind="work",
                                section="work",
                                public_category="works",
                                formula="flat_per_m2",
                            )
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

                saved = client.get("/api/calculator/flooring/coverings").json()
                row = next(item for item in saved if item["id"] == covering["id"])
                self.assertEqual(row["material_price_per_m2"], 333)

    def test_patch_covering_rejected_when_assembly_present(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"FP3b patch block {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={"title": "Состав", "rows": [_assembly_row()]},
                )

                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering['id']}",
                    json=_minimal_covering_kwargs(title="Blocked", material_price_per_m2=9999),
                )
                self.assertEqual(patch.status_code, 400)
                self.assertIn("assembly", patch.json()["detail"].lower())

    def test_patch_covering_blocked_after_put_empty_assembly_rows(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"FP3c empty shell {uuid4().hex}",
                            material_price_per_m2=55,
                        )
                    )
                )
                covering = {"id": covering_id}
                path = f"/api/calculator/flooring/covering/{covering['id']}/assembly"
                put = client.put(path, json={"title": "Shell", "rows": []})
                self.assertEqual(put.status_code, 400)

                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering['id']}",
                    json=_minimal_covering_kwargs(title="Allowed", material_price_per_m2=9999),
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price_per_m2"], 9999)

    def test_patch_covering_allowed_after_delete_assembly_shell(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"FP3c delete shell {uuid4().hex}",
                            material_price_per_m2=88,
                        )
                    )
                )
                covering = {"id": covering_id}
                path = f"/api/calculator/flooring/covering/{covering['id']}/assembly"
                client.put(path, json={"title": "Package", "rows": [_assembly_row()]})
                client.delete(path)

                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering['id']}",
                    json=_minimal_covering_kwargs(title="Allowed", material_price_per_m2=123),
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price_per_m2"], 123)

    def test_put_all_disabled_assembly_rejected_flat_unchanged(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"PF1 all disabled {uuid4().hex}",
                            material_price_per_m2=66,
                            labor_price_per_m2=77,
                        )
                    )
                )
                covering = {"id": covering_id}
                put = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Disabled package",
                        "rows": [_assembly_row(is_enabled=False)],
                    },
                )
                self.assertEqual(put.status_code, 400)

                saved = client.get("/api/calculator/flooring/coverings").json()
                row = next(item for item in saved if item["id"] == covering["id"])
                self.assertEqual(row["material_price_per_m2"], 66)
                self.assertEqual(row["labor_price_per_m2"], 77)

    def test_patch_covering_allowed_when_all_disabled_assembly_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"PF1 disabled patch {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Disabled package",
                        "rows": [_assembly_row(is_enabled=False)],
                    },
                )

                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering['id']}",
                    json=_minimal_covering_kwargs(title="Allowed", material_price_per_m2=9999),
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price_per_m2"], 9999)

    def test_delete_assembly_keeps_flat_rates(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"FP3b delete {uuid4().hex}",
                            material_price_per_m2=77,
                        )
                    )
                )
                covering = {"id": covering_id}
                path = f"/api/calculator/flooring/covering/{covering['id']}/assembly"
                client.put(
                    path,
                    json={
                        "title": "Состав",
                        "rows": [
                            _assembly_row(price=1000, consumption_per_m2=2, public_title="Mat"),
                        ],
                    },
                )
                synced = client.get("/api/calculator/flooring/coverings").json()
                row = next(item for item in synced if item["id"] == covering["id"])
                self.assertEqual(row["material_price_per_m2"], 2000)

                client.delete(path)
                after_delete = client.get("/api/calculator/flooring/coverings").json()
                row = next(item for item in after_delete if item["id"] == covering["id"])
                self.assertEqual(row["material_price_per_m2"], 2000)

    def test_put_covering_empty_rows_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(**_minimal_covering_kwargs(title=f"PF1 empty {uuid4().hex}"))
                )
                covering = {"id": covering_id}
                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={"title": "Empty", "rows": []},
                )
                self.assertEqual(response.status_code, 400)

    def test_put_covering_only_consumable_tool_without_material_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"PF1 no material {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "No material",
                        "rows": [
                            _assembly_row(
                                kind="consumable",
                                title="Клей",
                                public_category="consumables",
                                section="consumable",
                                formula="unit_consumption",
                                consumption_per_m2=1,
                            ),
                            _assembly_row(
                                kind="tool",
                                title="Инструмент",
                                public_category="tools",
                                section="tool",
                                formula="fixed_area_allocation",
                                unit="pcs",
                                price=500,
                                consumption_per_m2=0,
                            ),
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_covering_enabled_material_with_disabled_invalid_rows_accepted(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"PF1 disabled invalid {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Valid with disabled invalid",
                        "rows": [
                            _assembly_row(kind="material", public_category="materials"),
                            _assembly_row(
                                kind="consumable",
                                title="Bad glue",
                                public_category="consumables",
                                section="consumable",
                                formula="package_consumption",
                                price=100,
                                consumption_per_m2=1,
                                package_size=None,
                                is_enabled=False,
                            ),
                        ],
                    },
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.json()["rows"]), 2)

    def test_put_preparation_without_enabled_work_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                preparation = {
                    "id": _repo_create_preparation(
                        client.app.state.estimate_repository.for_owner(None), f"PF1 prep no work {uuid4().hex}"
                    )
                }
                response = client.put(
                    f"/api/calculator/flooring/preparation/{preparation['id']}/assembly",
                    json={
                        "title": "No work",
                        "rows": [
                            _assembly_row(
                                section="work",
                                kind="work",
                                formula="flat_per_m2",
                                public_category="works",
                                is_enabled=False,
                            )
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_layout_without_enabled_work_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                layout = {
                    "id": _repo_create_layout(
                        client.app.state.estimate_repository.for_owner(None), f"PF1 layout no work {uuid4().hex}"
                    )
                }
                response = client.put(
                    f"/api/calculator/flooring/layout/{layout['id']}/assembly",
                    json={"title": "No work", "rows": []},
                )
                self.assertEqual(response.status_code, 400)

    def test_put_package_formula_missing_package_size_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"PF1 missing pkg {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Bad package",
                        "rows": [
                            _assembly_row(kind="material", public_category="materials"),
                            _assembly_row(
                                kind="consumable",
                                title="Клей",
                                public_category="consumables",
                                section="consumable",
                                formula="package_consumption",
                                price=600,
                                consumption_per_m2=1.5,
                                package_size=None,
                            ),
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_put_layer_formula_missing_layer_mm_rejected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(title=f"PF1 missing layer {uuid4().hex}")
                    )
                )
                covering = {"id": covering_id}
                response = client.put(
                    f"/api/calculator/flooring/covering/{covering['id']}/assembly",
                    json={
                        "title": "Bad layer",
                        "rows": [
                            _assembly_row(kind="material", public_category="materials"),
                            _assembly_row(
                                kind="consumable",
                                title="Клей",
                                public_category="consumables",
                                section="consumable",
                                formula="kg_layer_consumption",
                                price=600,
                                consumption_per_m2=1.5,
                                package_size=25,
                                layer_mm=0,
                            ),
                        ],
                    },
                )
                self.assertEqual(response.status_code, 400)

    def test_patch_flat_allowed_after_delete_valid_assembly(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                repo = client.app.state.estimate_repository.for_owner(None)
                covering_id = asyncio.run(
                    repo.create_estimate_flooring_covering(
                        **_minimal_covering_kwargs(
                            title=f"PF1 patch after delete {uuid4().hex}",
                            material_price_per_m2=50,
                        )
                    )
                )
                covering = {"id": covering_id}
                path = f"/api/calculator/flooring/covering/{covering['id']}/assembly"
                client.put(path, json={"title": "Valid", "rows": [_assembly_row()]})
                client.delete(path)

                patch = client.patch(
                    f"/api/calculator/flooring/coverings/{covering['id']}",
                    json=_minimal_covering_kwargs(title="Patched", material_price_per_m2=321),
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["material_price_per_m2"], 321)


class AdminCalculatorFlooringPf4CreateRouteTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-pf4-route-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def _login_admin(self, client: TestClient) -> None:
        client.cookies.clear()
        token, _ = create_admin_session_token(
            self._settings.admin_session_secret or "",
            ttl_seconds=3600,
            subject="admin@example.test",
            role="admin",
        )
        client.cookies.set(SESSION_COOKIE_NAME, token)

    def test_flat_post_covering_returns_400(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                response = client.post(
                    "/api/calculator/flooring/coverings",
                    json=_minimal_covering_kwargs(title=f"Flat only {uuid4().hex}"),
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(FLOORING_FLAT_CATALOG_CREATE_BLOCKED, response.json()["detail"])

    def test_from_assembly_create_persists_assembly_and_projection(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            title = f"PF4 atomic {uuid4().hex}"
            with self._build_client() as client:
                self._login_admin(client)
                created = _post_covering_from_assembly(
                    client,
                    title,
                    [_assembly_row(title=title, public_title=title, price=1500)],
                    material_price_per_m2=1,
                )
                self.assertEqual(created.status_code, 200)
                covering_id = created.json()["id"]
                self.assertEqual(created.json()["material_price_per_m2"], 1500)

                assembly = client.get(f"/api/calculator/flooring/covering/{covering_id}/assembly")
                self.assertEqual(assembly.status_code, 200)
                self.assertGreaterEqual(len(assembly.json()["rows"]), 1)

    def test_from_assembly_invalid_package_returns_400_without_row(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            title = f"PF4 invalid {uuid4().hex}"
            with self._build_client() as client:
                self._login_admin(client)
                response = _post_covering_from_assembly(
                    client,
                    title,
                    [_assembly_row(kind="work", section="work", public_category="works")],
                )
                self.assertEqual(response.status_code, 400)
                listings = client.get("/api/calculator/flooring/coverings").json()
                self.assertFalse(any(item["title"] == title for item in listings))
