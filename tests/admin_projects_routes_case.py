from __future__ import annotations

from pathlib import Path
from unittest import TestCase


class AdminProjectsRouteCase(TestCase):
    def _create_settings_file(self, root: Path, *, extra_lines: list[str] | None = None) -> Path:
        config_path = root / ".env.test"
        config_path.write_text(
            "\n".join(
                [
                    "BOT_TOKEN=test-token",
                    "DEBUG=1",
                    "DATABASE_PATH=./test.sqlite3",
                    "ADMIN_PASSWORD_HASH=your_admin_password_hash_here",
                    "ADMIN_SESSION_SECRET=your_admin_session_secret_here",
                    "PROJECT_DOCUMENTS_DIR=./project-documents",
                    *(extra_lines or []),
                ]
            ),
            encoding="utf-8",
        )
        return config_path
