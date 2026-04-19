"""Маршруты для документов, привязанных к project ledger entry.

Модуль отвечает только за файловые и document-payload сценарии:
- upload исходного файла;
- update document metadata;
- download файла.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.document_transport import (
    build_document_download_response_or_http,
    delete_replaced_document_file_or_bad_request,
    read_document_storage_key,
    require_uploaded_document_name,
    resolve_document_storage_or_bad_request,
)
from supply_bot.admin_api.project_routes.shared import (
    extract_patch_payload,
    get_project_route_settings,
    get_project_route_storage,
    raise_bad_request,
    resolve_or_not_found,
    resolve_or_server_error,
)
from supply_bot.projects.access.documents import (
    build_project_ledger_document_download_response,
    store_project_ledger_document_file,
)
from supply_bot.projects.orchestration import (
    load_project_ledger_document_response,
    require_project,
    require_project_ledger_document,
    require_project_ledger_entry,
)
from supply_bot.projects.service import (
    ProjectValidationError,
    build_project_document_update_values,
    build_project_ledger_document_create_values,
)

# Поддерживаемые типы файлов для ledger-документов.
SUPPORTED_PROJECT_DOCUMENT_KINDS = {"invoice", "act"}


def ensure_supported_project_document_kind(kind: str) -> None:
    if kind not in SUPPORTED_PROJECT_DOCUMENT_KINDS:
        raise HTTPException(status_code=404, detail="Unsupported document kind")


# Регистрация HTTP-маршрутов только для ledger documents.
def register_project_ledger_document_routes(
    app: FastAPI,
    *,
    project_ledger_document_update_payload_model,
) -> None:
    async def upload_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        file: UploadFile = File(...),
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        ensure_supported_project_document_kind(kind)

        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        entry = await resolve_or_not_found(
            require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
        )

        file_name = require_uploaded_document_name(file, detail="Document file is required")

        existing_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
        previous_storage_key = read_document_storage_key(existing_document)
        storage_key, mime_type = await resolve_document_storage_or_bad_request(
            store_project_ledger_document_file(
                settings_obj,
                project_id=project_id,
                entry_id=entry_id,
                kind=kind,
                uploaded_file=file,
            )
        )

        document_values = build_project_ledger_document_create_values(
            kind=kind,
            entry=entry,
            existing_document=existing_document,
            source_file_name=file_name,
            source_mime_type=mime_type,
            source_storage_key=storage_key,
        )

        document_id = await storage_obj.upsert_project_ledger_document(
            project_id=project_id,
            ledger_entry_id=entry_id,
            kind=kind,
            **document_values,
        )

        delete_replaced_document_file_or_bad_request(
            settings_obj,
            previous_storage_key=previous_storage_key,
            next_storage_key=storage_key,
        )

        return await resolve_or_server_error(
            load_project_ledger_document_response(
                storage_obj,
                entry=entry,
                entry_id=entry_id,
                kind=kind,
                error_detail="Project document upload failed",
                document_id=document_id,
            )
        )

    app.post("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}/upload")(upload_project_ledger_document)

    async def update_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        ensure_supported_project_document_kind(kind)

        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        entry = await resolve_or_not_found(
            require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
        )
        await resolve_or_not_found(require_project_ledger_document(storage_obj, entry_id=entry_id, kind=kind))

        payload_data = extract_patch_payload(payload)
        if not payload_data:
            return await resolve_or_server_error(
                load_project_ledger_document_response(
                    storage_obj,
                    entry=entry,
                    entry_id=entry_id,
                    kind=kind,
                    error_detail="Project document lookup failed",
                )
            )

        try:
            updates = build_project_document_update_values(payload_data, kind=kind)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        await storage_obj.update_project_ledger_document(ledger_entry_id=entry_id, kind=kind, **updates)
        return await resolve_or_server_error(
            load_project_ledger_document_response(
                storage_obj,
                entry=entry,
                entry_id=entry_id,
                kind=kind,
                error_detail="Project document update failed",
            )
        )

    update_project_ledger_document.__annotations__["payload"] = project_ledger_document_update_payload_model
    app.patch("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}")(update_project_ledger_document)

    @app.get("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}/download")
    async def download_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        _session: AdminSession = Depends(require_admin_session),
    ) -> FileResponse:
        ensure_supported_project_document_kind(kind)

        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        await resolve_or_not_found(
            require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
        )
        document = await resolve_or_not_found(
            require_project_ledger_document(storage_obj, entry_id=entry_id, kind=kind)
        )

        return build_document_download_response_or_http(
            build_project_ledger_document_download_response,
            settings_obj,
            document,
            missing_detail="Project document file not found",
        )
