from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from fastapi import UploadFile

from supply_bot.config import load_settings
from supply_bot.file_storage import create_file_storage_adapter
from supply_bot.projects.access.documents import (
    ProjectDocumentStorageError,
    resolve_existing_project_document_path,
    resolve_project_document_path,
    store_project_contract_file,
)


def _create_settings_file(root: Path, *, extra_lines: list[str] | None = None) -> Path:
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


def test_project_document_storage_rejects_empty_and_root_storage_keys() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        file_storage = create_file_storage_adapter(settings)

        for storage_key in (
            "",
            " ",
            ".",
            "..",
            "project-1/..",
            "project-1/../../x",
            "/project-1/file.pdf",
            r"C:\temp\file.pdf",
        ):
            with pytest.raises(ProjectDocumentStorageError):
                resolve_project_document_path(file_storage, storage_key)


def test_project_document_storage_accepts_nested_document_keys() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        file_storage = create_file_storage_adapter(settings)

        for storage_key in ("project-1/document.pdf", "project-1/contracts/contract.pdf"):
            assert resolve_project_document_path(file_storage, storage_key) == (
                settings.project_documents_dir / storage_key
            ).resolve()


def test_project_document_storage_rejects_existing_directory_as_document() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        file_storage = create_file_storage_adapter(settings)
        document_dir = settings.project_documents_dir / "project-1"
        document_dir.mkdir(parents=True)

        with pytest.raises(ProjectDocumentStorageError, match="not a file"):
            resolve_existing_project_document_path(file_storage, "project-1")


def test_project_document_storage_resolves_existing_file_inside_root() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))
        file_storage = create_file_storage_adapter(settings)
        document_path = settings.project_documents_dir / "project-1" / "contract" / "contract.pdf"
        document_path.parent.mkdir(parents=True)
        document_path.write_bytes(b"%PDF-1.4\n")

        assert resolve_existing_project_document_path(
            file_storage,
            "project-1/contract/contract.pdf",
        ) == document_path.resolve()


def test_project_document_upload_writes_file_inside_configured_limit() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(
            _create_settings_file(root, extra_lines=["PROJECT_DOCUMENT_MAX_UPLOAD_BYTES=5"])
        )
        file_storage = create_file_storage_adapter(settings)
        uploaded_file = UploadFile(filename="contract.pdf", file=BytesIO(b"12345"))

        storage_key, mime_type = asyncio.run(
            store_project_contract_file(file_storage, settings, project_id=1, uploaded_file=uploaded_file)
        )

        stored_path = resolve_existing_project_document_path(file_storage, storage_key)
        assert stored_path.read_bytes() == b"12345"
        assert mime_type == "application/octet-stream"


def test_project_document_upload_rejects_file_over_configured_limit() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(
            _create_settings_file(root, extra_lines=["PROJECT_DOCUMENT_MAX_UPLOAD_BYTES=5"])
        )
        file_storage = create_file_storage_adapter(settings)
        uploaded_file = UploadFile(filename="contract.pdf", file=BytesIO(b"123456"))

        with pytest.raises(ProjectDocumentStorageError, match="too large"):
            asyncio.run(store_project_contract_file(file_storage, settings, project_id=1, uploaded_file=uploaded_file))

        stored_files = (
            [path for path in settings.project_documents_dir.rglob("*") if path.is_file()]
            if settings.project_documents_dir.exists()
            else []
        )
        assert stored_files == []
