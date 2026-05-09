from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from supply_bot.config import load_settings
from supply_bot.projects.access.documents import (
    ProjectDocumentStorageError,
    resolve_existing_project_document_path,
    resolve_project_document_path,
)


def _create_settings_file(root: Path) -> Path:
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
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_project_document_storage_rejects_empty_and_root_storage_keys() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        for storage_key in ("", " ", ".", "project-1/.."):
            with pytest.raises(ProjectDocumentStorageError):
                resolve_project_document_path(settings, storage_key)


def test_project_document_storage_rejects_existing_directory_as_document() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        document_dir = settings.project_documents_dir / "project-1"
        document_dir.mkdir(parents=True)

        with pytest.raises(ProjectDocumentStorageError, match="not a file"):
            resolve_existing_project_document_path(settings, "project-1")


def test_project_document_storage_resolves_existing_file_inside_root() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        document_path = settings.project_documents_dir / "project-1" / "contract" / "contract.pdf"
        document_path.parent.mkdir(parents=True)
        document_path.write_bytes(b"%PDF-1.4\n")

        assert resolve_existing_project_document_path(
            settings,
            "project-1/contract/contract.pdf",
        ) == document_path.resolve()
