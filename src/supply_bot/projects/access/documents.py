"""Файловые helper'ы для документов проекта.

Этот слой работает через file storage adapter и не дает routes напрямую знать,
где физически лежит PROJECT_DOCUMENTS_DIR.
"""

from __future__ import annotations

import secrets
from collections.abc import AsyncIterator
from pathlib import Path, PurePosixPath
from typing import Any, Mapping

from fastapi import UploadFile
from fastapi.responses import FileResponse

from supply_bot.config import Settings
from supply_bot.file_storage import FileStorageAdapter

PROJECT_DOCUMENT_UPLOAD_CHUNK_SIZE = 1024 * 1024


class ProjectDocumentStorageError(ValueError):
    """Ошибка файлового слоя project documents."""


def _document_suffix(file_name: str | None) -> str:
    suffix = Path(file_name or "").suffix.strip().lower()
    return suffix or ".bin"


def _project_document_max_upload_bytes(settings_obj: Settings) -> int:
    return max(1, int(settings_obj.project_document_max_upload_bytes))


def _normalize_project_document_storage_key(storage_key: str) -> str:
    normalized_storage_key = str(storage_key or "").strip().replace("\\", "/")
    if not normalized_storage_key or normalized_storage_key in {".", ".."}:
        raise ProjectDocumentStorageError("Project document path is empty")

    posix_path = PurePosixPath(normalized_storage_key)
    parts = posix_path.parts
    if posix_path.is_absolute() or not parts or parts[0].endswith(":") or ".." in parts:
        raise ProjectDocumentStorageError("Invalid project document path")
    return posix_path.as_posix()


async def _uploaded_file_chunks(uploaded_file: UploadFile) -> AsyncIterator[bytes]:
    while chunk := await uploaded_file.read(PROJECT_DOCUMENT_UPLOAD_CHUNK_SIZE):
        yield chunk


def resolve_project_document_path(file_storage: FileStorageAdapter, storage_key: str) -> Path:
    normalized_storage_key = _normalize_project_document_storage_key(storage_key)

    try:
        resolved_path = file_storage.resolve_local_path(normalized_storage_key)
    except ValueError as exc:
        raise ProjectDocumentStorageError(str(exc)) from exc
    if resolved_path is None:
        raise ProjectDocumentStorageError("Project document is not available through local file storage")
    return resolved_path


def resolve_existing_project_document_path(file_storage: FileStorageAdapter, storage_key: str) -> Path:
    resolved_path = resolve_project_document_path(file_storage, storage_key)
    if not resolved_path.exists():
        raise FileNotFoundError(storage_key)
    if not resolved_path.is_file():
        raise ProjectDocumentStorageError("Project document path is not a file")
    return resolved_path


async def delete_project_document_file(file_storage: FileStorageAdapter, *, storage_key: str | None) -> None:
    normalized_storage_key = str(storage_key or "").strip()
    if not normalized_storage_key:
        return

    try:
        await file_storage.delete(normalized_storage_key)
    except ValueError as exc:
        raise ProjectDocumentStorageError(str(exc)) from exc


def _build_project_document_download_response(
    file_storage: FileStorageAdapter,
    document_record: Mapping[str, Any],
    *,
    file_name: str,
) -> FileResponse:
    file_path = resolve_existing_project_document_path(file_storage, str(document_record["source_storage_key"]))
    return FileResponse(
        path=file_path,
        media_type=str(document_record["source_mime_type"] or "application/octet-stream"),
        filename=file_name,
    )


def build_project_contract_download_response(
    file_storage: FileStorageAdapter,
    contract: Mapping[str, Any],
) -> FileResponse:
    return _build_project_document_download_response(
        file_storage,
        contract,
        file_name=str(contract["source_file_name"] or contract["file_name"] or "contract"),
    )


def build_project_ledger_document_download_response(
    file_storage: FileStorageAdapter,
    document: Mapping[str, Any],
) -> FileResponse:
    return _build_project_document_download_response(
        file_storage,
        document,
        file_name=str(document["source_file_name"]),
    )


async def _store_project_document_file(
    file_storage: FileStorageAdapter,
    settings_obj: Settings,
    *,
    relative_directory: Path,
    storage_prefix: str,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    storage_name = f"{storage_prefix}-{secrets.token_hex(8)}{_document_suffix(uploaded_file.filename)}"
    storage_key = (relative_directory / storage_name).as_posix()
    try:
        stored_file = await file_storage.put_stream(
            storage_key,
            _uploaded_file_chunks(uploaded_file),
            content_type=uploaded_file.content_type or "application/octet-stream",
            max_bytes=_project_document_max_upload_bytes(settings_obj),
        )
    except ValueError as exc:
        raise ProjectDocumentStorageError(str(exc)) from exc

    return stored_file.key, stored_file.content_type


async def store_project_contract_file(
    file_storage: FileStorageAdapter,
    settings_obj: Settings,
    *,
    project_id: int,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    return await _store_project_document_file(
        file_storage,
        settings_obj,
        relative_directory=Path(f"project-{project_id}") / "contract",
        storage_prefix="contract",
        uploaded_file=uploaded_file,
    )


async def store_project_ledger_document_file(
    file_storage: FileStorageAdapter,
    settings_obj: Settings,
    *,
    project_id: int,
    entry_id: int,
    kind: str,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    return await _store_project_document_file(
        file_storage,
        settings_obj,
        relative_directory=Path(f"project-{project_id}") / "ledger" / f"entry-{entry_id}",
        storage_prefix=kind,
        uploaded_file=uploaded_file,
    )
