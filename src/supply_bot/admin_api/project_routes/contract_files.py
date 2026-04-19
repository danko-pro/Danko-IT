"""Маршруты для файлов договора проекта.

Этот модуль отвечает за:
- upload исходного файла договора;
- download файла;
- удаление договора вместе с его файлом.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.document_transport import (
    build_document_download_response_or_http,
    delete_document_file_or_bad_request,
    delete_replaced_document_file_or_bad_request,
    read_document_storage_key,
    require_uploaded_document_name,
    resolve_document_storage_or_bad_request,
)
from supply_bot.admin_api.project_routes.shared import (
    get_project_route_settings,
    get_project_route_storage,
    resolve_or_not_found,
    resolve_or_server_error,
)
from supply_bot.projects.access.documents import (
    build_project_contract_download_response,
    store_project_contract_file,
)
from supply_bot.projects.orchestration import (
    load_project_contract_response,
    require_project,
    require_project_contract_file,
)
from supply_bot.projects.service import build_project_contract_upload_values


# Регистрация HTTP-маршрутов для файлов договора.
def register_project_contract_file_routes(app: FastAPI) -> None:
    async def upload_project_contract_file(
        request: Request,
        project_id: int,
        file: UploadFile = File(...),
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        file_name = require_uploaded_document_name(file, detail="Contract file is required")

        storage_key, mime_type = await resolve_document_storage_or_bad_request(
            store_project_contract_file(
                settings_obj,
                project_id=project_id,
                uploaded_file=file,
            )
        )

        existing_contract = await storage_obj.get_project_contract(project_id)
        previous_storage_key = read_document_storage_key(existing_contract)

        contract_values = build_project_contract_upload_values(
            existing_contract=existing_contract,
            source_file_name=file_name,
            source_mime_type=mime_type,
            source_storage_key=storage_key,
            uploaded_at=date.today().isoformat(),
        )
        await storage_obj.upsert_project_contract(
            project_id=project_id,
            **contract_values,
        )

        delete_replaced_document_file_or_bad_request(
            settings_obj,
            previous_storage_key=previous_storage_key,
            next_storage_key=storage_key,
        )

        return await resolve_or_server_error(
            load_project_contract_response(
                storage_obj,
                project_id=project_id,
                error_detail="Project contract upload failed",
            )
        )

    app.post("/api/projects/{project_id}/contract/upload")(upload_project_contract_file)

    @app.delete("/api/projects/{project_id}/contract")
    async def delete_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))

        deleted_contract = await storage_obj.delete_project_contract(project_id)
        if not deleted_contract:
            raise HTTPException(status_code=404, detail="Project contract not found")

        delete_document_file_or_bad_request(
            settings_obj,
            storage_key=read_document_storage_key(deleted_contract),
        )

        return {"deleted": True, "project_id": project_id}

    @app.get("/api/projects/{project_id}/contract/download")
    async def download_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> FileResponse:
        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        contract = await resolve_or_not_found(require_project_contract_file(storage_obj, project_id))

        return build_document_download_response_or_http(
            build_project_contract_download_response,
            settings_obj,
            contract,
            missing_detail="Project contract file not found",
        )
