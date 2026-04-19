"""Файловые helpers для документов проекта.

Модуль инкапсулирует работу с файловой системой:
- вычисляет безопасные пути внутри project-documents каталога;
- сохраняет загруженные файлы;
- удаляет старые файлы;
- строит download response для API.
"""

from __future__ import annotations

import secrets
from pathlib import Path
from typing import Any, Mapping

from fastapi import UploadFile
from fastapi.responses import FileResponse

from supply_bot.config import Settings


# Ошибка файлового слоя проекта. Её потом переводит HTTP-слой.
class ProjectDocumentStorageError(ValueError):
    pass


# Базовые helpers для safe path handling.
def _project_documents_root(settings_obj: Settings) -> Path:
    return settings_obj.project_documents_dir.resolve()


def _ensure_within_project_documents_root(root: Path, target_path: Path) -> Path:
    try:
        target_path.relative_to(root)
    except ValueError as exc:
        raise ProjectDocumentStorageError("Invalid project document path") from exc
    return target_path


def _document_suffix(file_name: str | None) -> str:
    suffix = Path(file_name or "").suffix.strip().lower()
    return suffix or ".bin"


def resolve_project_document_path(settings_obj: Settings, storage_key: str) -> Path:
    root = _project_documents_root(settings_obj)
    resolved_path = (root / storage_key).resolve()
    return _ensure_within_project_documents_root(root, resolved_path)


def resolve_existing_project_document_path(settings_obj: Settings, storage_key: str) -> Path:
    resolved_path = resolve_project_document_path(settings_obj, storage_key)
    if not resolved_path.exists():
        raise FileNotFoundError(storage_key)
    return resolved_path


def delete_project_document_file(settings_obj: Settings, *, storage_key: str | None) -> None:
    normalized_storage_key = str(storage_key or "").strip()
    if not normalized_storage_key:
        return

    file_path = resolve_project_document_path(settings_obj, normalized_storage_key)
    if file_path.exists():
        file_path.unlink()


# Блок ответов на скачивание документов.
def _build_project_document_download_response(
    settings_obj: Settings,
    document_record: Mapping[str, Any],
    *,
    file_name: str,
) -> FileResponse:
    file_path = resolve_existing_project_document_path(settings_obj, str(document_record["source_storage_key"]))
    return FileResponse(
        path=file_path,
        media_type=str(document_record["source_mime_type"] or "application/octet-stream"),
        filename=file_name,
    )


def build_project_contract_download_response(
    settings_obj: Settings,
    contract: Mapping[str, Any],
) -> FileResponse:
    return _build_project_document_download_response(
        settings_obj,
        contract,
        file_name=str(contract["source_file_name"] or contract["file_name"] or "contract"),
    )


def build_project_ledger_document_download_response(
    settings_obj: Settings,
    document: Mapping[str, Any],
) -> FileResponse:
    return _build_project_document_download_response(
        settings_obj,
        document,
        file_name=str(document["source_file_name"]),
    )


# Блок сохранения новых файлов в project storage.
async def _store_project_document_file(
    settings_obj: Settings,
    *,
    relative_directory: Path,
    storage_prefix: str,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    root = _project_documents_root(settings_obj)
    target_dir = _ensure_within_project_documents_root(root, (root / relative_directory).resolve())
    target_dir.mkdir(parents=True, exist_ok=True)

    storage_name = f"{storage_prefix}-{secrets.token_hex(8)}{_document_suffix(uploaded_file.filename)}"
    target_path = _ensure_within_project_documents_root(root, (target_dir / storage_name).resolve())
    target_path.write_bytes(await uploaded_file.read())

    return (
        target_path.relative_to(root).as_posix(),
        uploaded_file.content_type or "application/octet-stream",
    )


async def store_project_contract_file(
    settings_obj: Settings,
    *,
    project_id: int,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    return await _store_project_document_file(
        settings_obj,
        relative_directory=Path(f"project-{project_id}") / "contract",
        storage_prefix="contract",
        uploaded_file=uploaded_file,
    )


async def store_project_ledger_document_file(
    settings_obj: Settings,
    *,
    project_id: int,
    entry_id: int,
    kind: str,
    uploaded_file: UploadFile,
) -> tuple[str, str]:
    return await _store_project_document_file(
        settings_obj,
        relative_directory=Path(f"project-{project_id}") / "ledger" / f"entry-{entry_id}",
        storage_prefix=kind,
        uploaded_file=uploaded_file,
    )
