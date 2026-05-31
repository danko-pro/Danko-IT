from __future__ import annotations

import logging
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from supply_bot.admin_api.app import create_admin_app
from supply_bot.admin_api.auth import hash_admin_password, verify_admin_password
from supply_bot.admin_api.bootstrap import bootstrap_admin_from_env
from supply_bot.config import load_settings
from supply_bot.storage_auth.tables import app_users


def _create_auth_settings_file(root: Path) -> Path:
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
                "ADMIN_SESSION_COOKIE_SECURE=0",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def _lookup_user(client: TestClient, email: str) -> dict | None:
    repository = client.app.state.user_auth_repository
    return client.portal.call(repository.get_app_user_by_email, email)


def _count_users_by_email(client: TestClient, email: str) -> int:
    repository = client.app.state.user_auth_repository
    normalized = email.strip().lower()

    async def _count() -> int:
        async with repository.session_factory() as session:
            result = await session.execute(
                select(func.count())
                .select_from(app_users)
                .where(app_users.c.email == normalized)
            )
            return int(result.scalar_one())

    return client.portal.call(_count)


def test_bootstrap_without_env_does_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ADMIN_BOOTSTRAP_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_BOOTSTRAP_PASSWORD", raising=False)
    monkeypatch.delenv("ADMIN_BOOTSTRAP_DISPLAY_NAME", raising=False)

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            assert _lookup_user(client, "bootstrap.admin@example.test") is None


def test_bootstrap_with_env_creates_admin_user(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "Bootstrap.Admin@example.test")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "bootstrap-secret-pass")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DISPLAY_NAME", "Bootstrap Admin")

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with caplog.at_level(logging.INFO):
            with TestClient(create_admin_app(settings)) as client:
                user = _lookup_user(client, "bootstrap.admin@example.test")
                count = _count_users_by_email(client, "bootstrap.admin@example.test")
                login_response = client.post(
                    "/api/auth/login",
                    json={
                        "email": "bootstrap.admin@example.test",
                        "password": "bootstrap-secret-pass",
                    },
                )

        assert count == 1
        assert user is not None
        assert user["role"] == "admin"
        assert user["display_name"] == "Bootstrap Admin"
        assert int(user["is_active"]) == 1
        assert verify_admin_password("bootstrap-secret-pass", str(user["password_hash"]))
        assert login_response.status_code == 200
        assert login_response.json()["user"]["role"] == "admin"
        assert "Admin bootstrap created for email=bootstrap.admin@example.test" in caplog.text
        assert "bootstrap-secret-pass" not in caplog.text


def test_bootstrap_second_run_is_idempotent_and_updates_existing(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "bootstrap-idempotent@example.test")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "first-bootstrap-pass")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_DISPLAY_NAME", "First Name")

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            first_user = _lookup_user(client, "bootstrap-idempotent@example.test")
            assert first_user is not None
            first_user_id = int(first_user["id"])

        monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "second-bootstrap-pass")
        monkeypatch.setenv("ADMIN_BOOTSTRAP_DISPLAY_NAME", "Updated Name")

        with caplog.at_level(logging.INFO):
            with TestClient(create_admin_app(settings)) as client:
                count = _count_users_by_email(client, "bootstrap-idempotent@example.test")
                updated_user = _lookup_user(client, "bootstrap-idempotent@example.test")
                login_response = client.post(
                    "/api/auth/login",
                    json={
                        "email": "bootstrap-idempotent@example.test",
                        "password": "second-bootstrap-pass",
                    },
                )

        assert count == 1
        assert updated_user is not None
        assert int(updated_user["id"]) == first_user_id
        assert updated_user["role"] == "admin"
        assert updated_user["display_name"] == "Updated Name"
        assert verify_admin_password("second-bootstrap-pass", str(updated_user["password_hash"]))
        assert not verify_admin_password("first-bootstrap-pass", str(updated_user["password_hash"]))
        assert login_response.status_code == 200
        assert "Admin bootstrap updated for email=bootstrap-idempotent@example.test" in caplog.text


def test_bootstrap_promotes_existing_registered_user_to_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ADMIN_BOOTSTRAP_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_BOOTSTRAP_PASSWORD", raising=False)

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            register_response = client.post(
                "/api/auth/register",
                json={
                    "email": "promoted-user@example.test",
                    "password": "registered-user-pass",
                    "display_name": "Registered User",
                },
            )
            assert register_response.status_code == 200
            assert register_response.json()["user"]["role"] == "user"

        monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "promoted-user@example.test")
        monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "promoted-admin-pass")

        with TestClient(create_admin_app(settings)) as client:
            user = _lookup_user(client, "promoted-user@example.test")
            count = _count_users_by_email(client, "promoted-user@example.test")
            login_response = client.post(
                "/api/auth/login",
                json={
                    "email": "promoted-user@example.test",
                    "password": "promoted-admin-pass",
                },
            )

        assert count == 1
        assert user is not None
        assert user["role"] == "admin"
        assert verify_admin_password("promoted-admin-pass", str(user["password_hash"]))
        assert login_response.status_code == 200
        assert login_response.json()["user"]["role"] == "admin"


def test_register_endpoint_still_creates_user_role_only(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "bootstrap-admin@example.test")
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "bootstrap-secret-pass")

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            register_response = client.post(
                "/api/auth/register",
                json={
                    "email": "regular-user@example.test",
                    "password": "regular-user-pass",
                    "display_name": "Regular User",
                },
            )

        assert register_response.status_code == 200
        assert register_response.json()["user"]["role"] == "user"


def test_bootstrap_direct_call_skips_when_env_incomplete(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.delenv("ADMIN_BOOTSTRAP_EMAIL", raising=False)
    monkeypatch.setenv("ADMIN_BOOTSTRAP_PASSWORD", "only-password")

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_auth_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            repository = client.app.state.user_auth_repository
            with caplog.at_level(logging.INFO):
                client.portal.call(bootstrap_admin_from_env, repository)

        assert "Admin bootstrap" not in caplog.text
