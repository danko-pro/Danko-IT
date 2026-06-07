"""PF8: package-first flooring admin → public snapshot E2E chain (TestClient, no generated JSON)."""

from __future__ import annotations

import asyncio
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, create_admin_session_token
from supply_bot.config import Settings, load_settings
from supply_bot.estimates.application.flooring_catalog_assembly import FLOORING_FLAT_CATALOG_CREATE_BLOCKED
from supply_bot.estimates.application.flooring_snapshot import (
    BuildFlooringSnapshotUseCase,
    covering_spec_lines_are_complete,
)
from tests.admin_projects_routes_case import AdminProjectsRouteCase
from tests.test_admin_calculator_flooring_routes import (
    _assembly_row,
    _post_covering_from_assembly,
)
from tests.test_public_flooring_snapshot_whitelist import _minimal_covering_kwargs

_SPEC_LINE_REQUIRED_KEYS = frozenset(
    {"code", "title", "category", "basis", "unit", "quantityPerBasis", "unitPrice"},
)


def _assert_valid_spec_lines(section: str, row: dict[str, Any]) -> None:
    spec_lines = row.get("specLines")
    assert isinstance(spec_lines, list), f"{section} row missing specLines"
    assert len(spec_lines) > 0, f"{section} row has empty specLines"
    for index, line in enumerate(spec_lines):
        assert isinstance(line, dict), f"{section} specLines[{index}] must be object"
        missing = _SPEC_LINE_REQUIRED_KEYS - set(line.keys())
        assert not missing, f"{section} specLines[{index}] missing keys: {sorted(missing)}"


class FlooringPackageFirstE2eTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-pf8-e2e-secret-{suffix}",
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

    def test_pf8_flat_post_covering_preparation_layout_returns_400(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            suffix = uuid4().hex
            with self._build_client() as client:
                self._login_admin(client)
                for path, payload in (
                    (
                        "/api/calculator/flooring/coverings",
                        _minimal_covering_kwargs(title=f"Flat covering {suffix}"),
                    ),
                    (
                        "/api/calculator/flooring/preparations",
                        {
                            "title": f"Flat preparation {suffix}",
                            "labor_price_per_m2": 100,
                            "material_price_per_m2": 0,
                        },
                    ),
                    (
                        "/api/calculator/flooring/layouts",
                        {
                            "title": f"Flat layout {suffix}",
                            "labor_price_per_m2": 100,
                            "labor_multiplier": 1,
                            "extra_waste_percent": 0,
                        },
                    ),
                ):
                    response = client.post(path, json=payload)
                    self.assertEqual(response.status_code, 400, path)
                    self.assertIn(FLOORING_FLAT_CATALOG_CREATE_BLOCKED, response.json()["detail"])

    def test_pf8_admin_from_assembly_chain_exposes_package_backed_public_snapshot(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            suffix = uuid4().hex
            covering_title = f"PF8 покрытие {suffix}"
            preparation_title = f"PF8 подготовка {suffix}"
            layout_title = f"PF8 укладка {suffix}"

            with self._build_client() as client:
                self._login_admin(client)

                covering = _post_covering_from_assembly(
                    client,
                    covering_title,
                    [
                        _assembly_row(
                            title=covering_title,
                            public_title=covering_title,
                            price=3456,
                            consumption_per_m2=1,
                        ),
                        _assembly_row(
                            section="consumable",
                            kind="consumable",
                            formula="unit_consumption",
                            title="Грунт",
                            public_title="Грунт",
                            unit="l",
                            price=250,
                            consumption_per_m2=0.1,
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
                    ],
                    material_price_per_m2=3456,
                    labor_price_per_m2=0,
                    underlay_mode="none",
                )
                self.assertEqual(covering.status_code, 200)
                covering_id = covering.json()["id"]

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

                assembly_readback = client.get(f"/api/calculator/flooring/covering/{covering_id}/assembly")
                self.assertEqual(assembly_readback.status_code, 200)
                self.assertGreaterEqual(len(assembly_readback.json()["rows"]), 1)

                snapshot_response = client.get("/api/public/catalog/flooring/snapshot")
                self.assertEqual(snapshot_response.status_code, 200)
                payload = snapshot_response.json()
                self.assertEqual(payload["version"], "flooring-v2")

                custom_covering = next(item for item in payload["coverings"] if item["title"] == covering_title)
                custom_preparation = next(
                    item for item in payload["preparations"] if item["title"] == preparation_title
                )
                custom_layout = next(item for item in payload["layouts"] if item["title"] == layout_title)

                self.assertEqual(custom_covering["materialPricePerM2"], 3456)
                self.assertEqual(custom_preparation["laborPricePerM2"], 456)
                self.assertEqual(custom_layout["laborPricePerM2"], 2814)
                self.assertEqual(custom_layout["laborFactor"], 1.2)

                _assert_valid_spec_lines("coverings", custom_covering)
                _assert_valid_spec_lines("preparations", custom_preparation)
                _assert_valid_spec_lines("layouts", custom_layout)

                repo = client.app.state.estimate_repository.for_owner(None)
                use_case_payload = asyncio.run(BuildFlooringSnapshotUseCase(repo).build_public())
                uc_covering = next(
                    item for item in use_case_payload["coverings"] if item["title"] == covering_title
                )
                self.assertEqual(uc_covering["code"], custom_covering["code"])
                self.assertTrue(
                    covering_spec_lines_are_complete(
                        {
                            "materialPricePerM2": uc_covering["materialPricePerM2"],
                            "underlayPricePerM2": uc_covering.get("underlayPricePerM2", 0),
                            "adhesivePricePerM2": uc_covering.get("adhesivePricePerM2", 0),
                            "primerPricePerM2": uc_covering.get("primerPricePerM2", 0),
                            "svpPricePerM2": uc_covering.get("svpPricePerM2", 0),
                            "groutPricePerM2": uc_covering.get("groutPricePerM2", 0),
                            "toolConsumablesPerM2": uc_covering.get("toolConsumablesPerM2", 0),
                        },
                        uc_covering["specLines"],
                    )
                )

    def test_pf8_invalid_from_assembly_package_not_in_public_snapshot(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            title = f"PF8 invalid {uuid4().hex}"
            with self._build_client() as client:
                self._login_admin(client)
                response = _post_covering_from_assembly(
                    client,
                    title,
                    [_assembly_row(kind="work", section="work", public_category="works")],
                )
                self.assertEqual(response.status_code, 400)

                snapshot = client.get("/api/public/catalog/flooring/snapshot").json()
                self.assertFalse(any(item.get("title") == title for item in snapshot["coverings"]))

                repo = client.app.state.estimate_repository.for_owner(None)
                use_case_payload = asyncio.run(BuildFlooringSnapshotUseCase(repo).build_public())
                self.assertFalse(
                    any(item.get("title") == title for item in use_case_payload["coverings"]),
                )


if __name__ == "__main__":
    unittest.main()
