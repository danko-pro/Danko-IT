from __future__ import annotations

import json
import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import Settings, load_settings
from supply_bot.estimates.application.flooring_snapshot import (
    DEFAULT_PUBLIC_FLOORING_SNAPSHOT,
    EXPECTED_COVERING_CODES,
    EXPECTED_LAYOUT_CODES,
    EXPECTED_PLINTH_CODES,
    EXPECTED_PREPARATION_CODES,
    PUBLIC_FLOORING_FORBIDDEN_KEYS,
)
from tests.admin_projects_routes_case import AdminProjectsRouteCase

_F1_SNAPSHOT_PATH = (
    Path(__file__).resolve().parents[1]
    / "admin-ui"
    / "src"
    / "features"
    / "public"
    / "generated"
    / "flooring.snapshot.json"
)


def _walk_keys(node: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(node, dict):
        for key, value in node.items():
            found.add(str(key))
            found |= _walk_keys(value)
    elif isinstance(node, (list, tuple)):
        for item in node:
            found |= _walk_keys(item)
    return found


class PublicFlooringSnapshotWhitelistTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"flooring-public-snapshot-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def test_public_snapshot_is_open_and_whitelisted(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                response = client.get("/api/public/catalog/flooring/snapshot")
                self.assertEqual(response.status_code, 200)
                payload = response.json()

                self.assertEqual(payload["version"], "flooring-v1")
                self.assertIn("coverings", payload)
                self.assertIn("preparations", payload)
                self.assertIn("layouts", payload)
                self.assertIn("plinthTypes", payload)
                self.assertIn("globalAddons", payload)

                covering_codes = {item["code"] for item in payload["coverings"]}
                preparation_codes = {item["code"] for item in payload["preparations"]}
                layout_codes = {item["code"] for item in payload["layouts"]}
                plinth_codes = {item["code"] for item in payload["plinthTypes"]}

                self.assertEqual(covering_codes, EXPECTED_COVERING_CODES)
                self.assertEqual(preparation_codes, EXPECTED_PREPARATION_CODES)
                self.assertEqual(layout_codes, EXPECTED_LAYOUT_CODES)
                self.assertEqual(plinth_codes, EXPECTED_PLINTH_CODES)

                present_keys = _walk_keys(payload)
                leaked = present_keys & PUBLIC_FLOORING_FORBIDDEN_KEYS
                self.assertEqual(leaked, set(), f"Публичный снапшот раскрыл internal-поля: {sorted(leaked)}")

    def test_public_snapshot_matches_f1_golden_numbers(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                payload = client.get("/api/public/catalog/flooring/snapshot").json()

                self.assertEqual(payload, DEFAULT_PUBLIC_FLOORING_SNAPSHOT)

                f1_snapshot = json.loads(_F1_SNAPSHOT_PATH.read_text(encoding="utf-8"))
                self.assertEqual(payload, f1_snapshot)

                laminate = next(item for item in payload["coverings"] if item["code"] == "laminate")
                self.assertEqual(laminate["materialPricePerM2"], 930)
                self.assertEqual(payload["globalAddons"]["thresholdPrice"], 900)
                self.assertEqual(payload["globalAddons"]["demolitionPricePerM2"], 150)


if __name__ == "__main__":
    unittest.main()
