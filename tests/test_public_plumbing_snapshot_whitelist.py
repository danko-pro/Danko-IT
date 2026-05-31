from __future__ import annotations

import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import Settings, load_settings
from supply_bot.estimates.application.plumbing_snapshot import PUBLIC_FORBIDDEN_KEYS
from tests.admin_projects_routes_case import AdminProjectsRouteCase

# Парити-эталон «Зоны мойки» (zone-kitchen-sink), A3 / public-estimate-plumbing-zones.ts.
_SINK_PACKAGE_TOTALS = {"c": 39487, "b": 43530, "a": 54915}
_SINK_ACTIVE_TOTAL = 43530

# Поля, которые публичный снапшот не должен раскрывать (A7.1, Q3 §1.1).
# Совпадает со списком из плана: technical_title, *_price (разбивка), coefficient, source, note, risk_percent.
_FORBIDDEN_KEYS = frozenset(PUBLIC_FORBIDDEN_KEYS) | {
    "technical_title",
    "technicalTitle",
    "work_price",
    "material_price",
    "equipment_price",
    "consumables_price",
    "coefficient",
    "source",
    "note",
    "risk_percent",
    "riskPercent",
}


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


class PublicPlumbingSnapshotWhitelistTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"public-snapshot-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def test_public_snapshot_is_open_and_whitelisted(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                # Публичный эндпоинт: без admin-сессии должен отдавать 200.
                response = client.get("/api/public/catalog/plumbing/snapshot")
                self.assertEqual(response.status_code, 200)
                payload = response.json()

                self.assertIn("version", payload)
                self.assertIn("items", payload)
                self.assertIn("zones", payload)

                # Whitelist: ни одного запрещённого ключа на любом уровне вложенности.
                present_keys = _walk_keys(payload)
                leaked = present_keys & _FORBIDDEN_KEYS
                self.assertEqual(leaked, set(), f"Публичный снапшот раскрыл internal-поля: {sorted(leaked)}")

    def test_public_snapshot_reproduces_sink_parity_with_baked_risk(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                payload = client.get("/api/public/catalog/plumbing/snapshot").json()

                sink = next(zone for zone in payload["zones"] if zone["code"] == "zone-kitchen-sink")
                # Резерв (6.4%) уже запечён в итоги пакетов и зоны; отдельной строки/процента нет.
                self.assertEqual(sink["activePackage"], "b")
                self.assertEqual(sink["total"], _SINK_ACTIVE_TOTAL)
                package_totals = {package["code"]: package["total"] for package in sink["packages"]}
                self.assertEqual(package_totals, _SINK_PACKAGE_TOTALS)

                # Линии спецификации не раскрывают цену/разбивку — только itemCode + quantity.
                for line in sink["base"]:
                    self.assertEqual(set(line.keys()), {"itemCode", "quantity"})


if __name__ == "__main__":
    unittest.main()
