from __future__ import annotations

from unittest import TestCase

from supply_bot.admin_api.auth import (
    create_admin_session_token,
    hash_admin_password,
    read_admin_session_token,
    verify_admin_password,
)


class AdminAuthTests(TestCase):
    def test_password_hash_roundtrip(self) -> None:
        password_hash = hash_admin_password("secret-pass", salt="fixed-salt", iterations=120000)

        self.assertTrue(verify_admin_password("secret-pass", password_hash))
        self.assertFalse(verify_admin_password("wrong-pass", password_hash))

    def test_session_token_roundtrip(self) -> None:
        token, session = create_admin_session_token(
            "session-secret",
            ttl_seconds=3600,
            subject="admin",
            role="admin",
        )

        restored = read_admin_session_token(token, "session-secret")

        self.assertIsNotNone(restored)
        assert restored is not None
        self.assertEqual(restored.subject, session.subject)
        self.assertEqual(restored.role, session.role)
        self.assertGreater(restored.expires_at, 0)

    def test_session_token_rejects_wrong_secret(self) -> None:
        token, _ = create_admin_session_token("session-secret", ttl_seconds=3600)

        restored = read_admin_session_token(token, "other-secret")

        self.assertIsNone(restored)
