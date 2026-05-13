"""Transport-helper'ы для project document file routes.

Маршруты не должны вручную дублировать:
- проверку имени загруженного файла;
- перевод file/storage ошибок в HTTPException;
- логику удаления заменённого source file;
- mapping FileNotFoundError для download и AI extraction сценариев.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Awaitable, Callable, Mapping, TypeVar

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse

from supply_bot.file_storage import FileStorageAdapter
from supply_bot.projects.access.documents import (
    ProjectDocumentStorageError,
    delete_project_document_file,
    resolve_existing_project_document_path,
)

_T = TypeVar("_T")


def require_uploaded_document_name(uploaded_file: UploadFile, *, detail: str) -> str:
    file_name = str(uploaded_file.filename or "").strip()
    if not file_name:
        raise HTTPException(status_code=400, detail=detail)
    return file_name


def read_document_storage_key(document_record: Mapping[str, Any] | None) -> str | None:
    if not document_record:
        return None
    storage_key = str(document_record.get("source_storage_key") or "").strip()
    return storage_key or None


async def resolve_document_storage_or_bad_request(awaitable: Awaitable[_T]) -> _T:
    try:
        return await awaitable
    except ProjectDocumentStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def delete_document_file_or_bad_request(
    file_storage: FileStorageAdapter,
    *,
    storage_key: str | None,
) -> None:
    try:
        await delete_project_document_file(file_storage, storage_key=storage_key)
    except ProjectDocumentStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def delete_replaced_document_file_or_bad_request(
    file_storage: FileStorageAdapter,
    *,
    previous_storage_key: str | None,
    next_storage_key: str | None,
) -> None:
    if not previous_storage_key or previous_storage_key == next_storage_key:
        return
    await delete_document_file_or_bad_request(file_storage, storage_key=previous_storage_key)


def resolve_document_file_path_or_http(
    file_storage: FileStorageAdapter,
    *,
    storage_key: str | None,
    missing_detail: str,
) -> Path:
    normalized_storage_key = str(storage_key or "").strip()
    try:
        return resolve_existing_project_document_path(file_storage, normalized_storage_key)
    except ProjectDocumentStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=missing_detail) from exc


def build_document_download_response_or_http(
    download_builder: Callable[[FileStorageAdapter, Mapping[str, Any]], FileResponse],
    file_storage: FileStorageAdapter,
    document_record: Mapping[str, Any],
    *,
    missing_detail: str,
) -> FileResponse:
    try:
        return download_builder(file_storage, document_record)
    except ProjectDocumentStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=missing_detail) from exc
