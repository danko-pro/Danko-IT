from __future__ import annotations

import unittest
from dataclasses import replace
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import SESSION_COOKIE_NAME, create_admin_session_token
from supply_bot.config import Settings, load_settings
from tests.admin_projects_routes_case import AdminProjectsRouteCase


class PublicWarmFloorSnapshotTests(AdminProjectsRouteCase):
    def _build_client(self) -> TestClient:
        suffix = uuid4().hex
        self._settings: Settings = replace(
            load_settings(self._create_settings_file(self._root)),
            admin_session_secret=f"warm-floor-public-test-secret-{suffix}",
        )
        return TestClient(create_admin_app(self._settings))

    def _login_admin(self, client: TestClient, *, subject: str = "admin@example.test") -> None:
        token, _ = create_admin_session_token(
            self._settings.admin_session_secret or "",
            ttl_seconds=3600,
            subject=subject,
            role="admin",
        )
        client.cookies.clear()
        client.cookies.set(SESSION_COOKIE_NAME, token)

    def test_public_snapshot_is_open_and_uses_default_rates(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                response = client.get("/api/public/catalog/warm-floor/snapshot")

                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(payload["version"], "warm-floor-v1")
                self.assertEqual(payload["water"]["waterLaborRatePerM2"], 1600)
                self.assertEqual(payload["water"]["pipePricePerMeter"], 168.78)
                self.assertEqual(payload["electric"]["electricMatPricePerM2"], 2700)
                self.assertEqual(payload["electric"]["electricInstallationLabor"], 7000)

    def test_admin_config_is_role_gated_and_reaches_public_snapshot(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self.assertEqual(client.get("/api/calculator/warm-floor/config").status_code, 401)

                register = client.post(
                    "/api/auth/register",
                    json={
                        "email": f"warm-floor-user-{uuid4().hex}@example.test",
                        "password": "password-user",
                        "display_name": "Warm floor user",
                    },
                )
                self.assertEqual(register.status_code, 200)
                self.assertEqual(client.get("/api/calculator/warm-floor/config").status_code, 403)

                self._login_admin(client)
                config = client.get("/api/calculator/warm-floor/config")
                self.assertEqual(config.status_code, 200)
                self.assertEqual(config.json()["pipe_price_per_meter"], 168.78)

                patch = client.patch(
                    "/api/calculator/warm-floor/config",
                    json={
                        "pipe_price_per_meter": 222.5,
                        "electric_mat_price_per_m2": 3100,
                    },
                )
                self.assertEqual(patch.status_code, 200)
                self.assertEqual(patch.json()["pipe_price_per_meter"], 222.5)
                self.assertEqual(patch.json()["electric_mat_price_per_m2"], 3100)

                public_snapshot = client.get("/api/public/catalog/warm-floor/snapshot")
                self.assertEqual(public_snapshot.status_code, 200)
                payload = public_snapshot.json()
                self.assertEqual(payload["water"]["pipePricePerMeter"], 222.5)
                self.assertEqual(payload["electric"]["electricMatPricePerM2"], 3100)

                preview = client.get("/api/calculator/warm-floor/snapshot/preview")
                self.assertEqual(preview.status_code, 200)
                self.assertEqual(preview.json()["water"]["pipePricePerMeter"], 222.5)

    def test_admin_config_rejects_negative_rates(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            self._root = Path(tmp_dir)
            with self._build_client() as client:
                self._login_admin(client)
                response = client.patch(
                    "/api/calculator/warm-floor/config",
                    json={"pipe_price_per_meter": -1},
                )
                self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
