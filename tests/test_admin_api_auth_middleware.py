from __future__ import annotations

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.admin_api.public_rate_limit import PublicLeadRateLimiter
from supply_bot.config import load_settings


def _create_auth_settings_file(
    root: Path,
    *,
    cookie_secure: bool = False,
    cookie_samesite: str | None = None,
) -> Path:
    cookie_settings = [f"ADMIN_SESSION_COOKIE_SECURE={int(cookie_secure)}"]
    if cookie_samesite is not None:
        cookie_settings.append(f"ADMIN_SESSION_COOKIE_SAMESITE={cookie_samesite}")

    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                f"ADMIN_PASSWORD_HASH={hash_admin_password('admin-pass', salt='fixed-salt', iterations=120000)}",
                "ADMIN_SESSION_SECRET=test-session-secret",
                "ADMIN_SESSION_TTL_SECONDS=3600",
                *cookie_settings,
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_admin_api_middleware_requires_session_for_private_routes() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            assert client.get("/api/auth/session").status_code == 200
            assert client.get("/api/health").status_code == 200

            for path in (
                "/api/dashboard/summary",
                "/api/requests/recent",
                "/api/materials/families",
                "/api/calculator/projects",
            ):
                response = client.get(path)
                assert response.status_code == 401
                assert response.json()["detail"] == "Admin authentication required"

            reset_response = client.post("/api/requests/expire-stale")
            assert reset_response.status_code == 401
            assert reset_response.json()["detail"] == "Admin authentication required"


class PublicLeadRouteTests(unittest.TestCase):
    def test_public_leads_endpoint_is_public_and_private_routes_remain_protected(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(_create_auth_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                response = client.post(
                    "/api/public/leads",
                    json={
                        "name": "Test",
                        "phone": "@test",
                        "objectType": "Apartment",
                        "area": "50",
                        "packageType": "Package C",
                        "contactMethod": "telegram",
                        "comment": "Public endpoint smoke test",
                        "personalDataConsent": True,
                        "website": "",
                    },
                )
                private_response = client.get("/api/requests/recent")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(private_response.status_code, 401)
        self.assertEqual(private_response.json()["detail"], "Admin authentication required")

    def test_public_leads_endpoint_validates_required_and_limited_fields_without_session(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(_create_auth_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                minimal_response = client.post(
                    "/api/public/leads",
                    json={"name": "Test", "phone": "@test", "personalDataConsent": True, "website": ""},
                )
                missing_name_response = client.post(
                    "/api/public/leads",
                    json={"phone": "@test", "personalDataConsent": True},
                )
                missing_consent_response = client.post(
                    "/api/public/leads",
                    json={"name": "Test", "phone": "@test"},
                )
                declined_consent_response = client.post(
                    "/api/public/leads",
                    json={"name": "Test", "phone": "@test", "personalDataConsent": False},
                )
                honeypot_response = client.post(
                    "/api/public/leads",
                    json={
                        "name": "Test",
                        "phone": "@test",
                        "personalDataConsent": True,
                        "website": "https://spam.example",
                    },
                )
                long_area_response = client.post(
                    "/api/public/leads",
                    json={
                        "name": "Test",
                        "phone": "@test",
                        "area": "1" * 41,
                        "personalDataConsent": True,
                    },
                )

        self.assertEqual(minimal_response.status_code, 200)
        self.assertEqual(minimal_response.json(), {"ok": True})
        self.assertEqual(missing_name_response.status_code, 422)
        self.assertEqual(missing_consent_response.status_code, 422)
        self.assertEqual(declined_consent_response.status_code, 422)
        self.assertEqual(honeypot_response.status_code, 422)
        self.assertEqual(long_area_response.status_code, 422)

    def test_public_leads_endpoint_rate_limits_by_client_ip(self) -> None:
        with TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            settings = load_settings(_create_auth_settings_file(root))

            with TestClient(create_admin_app(settings)) as client:
                responses = [
                    client.post(
                        "/api/public/leads",
                        headers={"X-Forwarded-For": "203.0.113.10"},
                        json={
                            "name": "Test",
                            "phone": "@test",
                            "personalDataConsent": True,
                            "website": "",
                        },
                    )
                    for _ in range(6)
                ]

        for response in responses[:5]:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(responses[5].status_code, 429)
        self.assertIn("retry-after", responses[5].headers)

    def test_public_lead_rate_limiter_prunes_old_requests(self) -> None:
        current_time = 1000.0
        limiter = PublicLeadRateLimiter(max_requests=2, window_seconds=60, time_func=lambda: current_time)

        self.assertTrue(limiter.check("203.0.113.20").allowed)
        self.assertTrue(limiter.check("203.0.113.20").allowed)

        blocked_decision = limiter.check("203.0.113.20")
        self.assertFalse(blocked_decision.allowed)
        self.assertEqual(blocked_decision.retry_after_seconds, 60)

        current_time = 1061.0
        self.assertTrue(limiter.check("203.0.113.20").allowed)


def test_admin_api_middleware_accepts_valid_session_for_private_routes() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})

            assert login_response.status_code == 200
            assert login_response.json()["authenticated"] is True
            assert client.get("/api/calculator/projects").status_code == 200


def test_admin_session_cookie_secure_flag_is_configurable() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root, cookie_secure=True))

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})

            assert login_response.status_code == 200
            assert "secure" in login_response.headers["set-cookie"].lower()


def test_admin_session_cookie_samesite_defaults_to_lax() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        assert settings.admin_session_cookie_samesite == "lax"

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})

            assert login_response.status_code == 200
            assert "samesite=lax" in login_response.headers["set-cookie"].lower()


def test_admin_session_cookie_samesite_none_is_configurable_for_cross_origin_render() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(
            _create_auth_settings_file(root, cookie_secure=True, cookie_samesite="None")
        )

        assert settings.admin_session_cookie_samesite == "none"

        with TestClient(create_admin_app(settings)) as client:
            login_response = client.post("/api/auth/login", json={"password": "admin-pass"})
            logout_response = client.post("/api/auth/logout")

            assert login_response.status_code == 200
            assert "secure" in login_response.headers["set-cookie"].lower()
            assert "samesite=none" in login_response.headers["set-cookie"].lower()
            assert logout_response.status_code == 200
            assert "samesite=none" in logout_response.headers["set-cookie"].lower()


def test_admin_session_cookie_samesite_none_requires_secure_cookie() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)

        try:
            load_settings(_create_auth_settings_file(root, cookie_secure=False, cookie_samesite="None"))
        except ValueError as exc:
            assert "ADMIN_SESSION_COOKIE_SAMESITE=None requires ADMIN_SESSION_COOKIE_SECURE=True" in str(exc)
        else:
            raise AssertionError("SameSite=None without Secure=True must be rejected")
