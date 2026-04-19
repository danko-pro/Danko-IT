"""Маршруты для самих записей project ledger.

Этот модуль отвечает только за CRUD-поток по ledger entry:
- список записей;
- создание;
- обновление;
- удаление.

Документы ledger вынесены в отдельный модуль, чтобы не смешивать
работу с записью и работу с файлами.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.shared import (
    extract_patch_payload,
    get_project_route_storage,
    raise_bad_request,
    resolve_or_http_error,
    resolve_or_not_found,
)
from supply_bot.projects.access.readers import build_project_ledger_payloads
from supply_bot.projects.orchestration import (
    create_project_ledger_entry_response,
    delete_project_ledger_entry_response,
    require_project,
    require_project_ledger_entry,
    update_project_ledger_entry_response,
)
from supply_bot.projects.service import (
    ProjectValidationError,
    build_project_ledger_create_values,
    build_project_ledger_entry_payload,
    build_project_ledger_update_values,
    build_project_payload,
)


# Регистрация HTTP-маршрутов только для ledger entry.
def register_project_ledger_entry_routes(
    app: FastAPI,
    *,
    project_ledger_entry_create_payload_model,
    project_ledger_entry_update_payload_model,
) -> None:
    @app.get("/api/projects/{project_id}/ledger")
    async def list_project_ledger_entries(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        entries = await storage_obj.list_project_ledger_entries(project_id)
        return await build_project_ledger_payloads(storage_obj, project_id=project_id, entries=entries)

    async def create_project_ledger_entry(
        request: Request,
        project_id: int,
        payload,
        sync_summary: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)

        try:
            entry_values = build_project_ledger_create_values(payload)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        return await resolve_or_http_error(
            create_project_ledger_entry_response(
                storage_obj,
                project_id=project_id,
                sync_summary=sync_summary,
                entry_values=entry_values,
            )
        )

    create_project_ledger_entry.__annotations__["payload"] = project_ledger_entry_create_payload_model
    app.post("/api/projects/{project_id}/ledger")(create_project_ledger_entry)

    async def update_project_ledger_entry(
        request: Request,
        project_id: int,
        entry_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        project = await resolve_or_not_found(require_project(storage_obj, project_id))
        entry = await resolve_or_not_found(
            require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
        )

        payload_data = extract_patch_payload(payload)
        if not payload_data:
            return {
                "entry": build_project_ledger_entry_payload(entry),
                "project": build_project_payload(project),
            }

        try:
            updates = build_project_ledger_update_values(
                payload_data,
                counterparty_details=payload.counterparty_details,
            )
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        return await resolve_or_http_error(
            update_project_ledger_entry_response(
                storage_obj,
                project_id=project_id,
                entry_id=entry_id,
                updates=updates,
            )
        )

    update_project_ledger_entry.__annotations__["payload"] = project_ledger_entry_update_payload_model
    app.patch("/api/projects/{project_id}/ledger/{entry_id}")(update_project_ledger_entry)

    @app.delete("/api/projects/{project_id}/ledger/{entry_id}")
    async def delete_project_ledger_entry(
        request: Request,
        project_id: int,
        entry_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        return await resolve_or_http_error(
            delete_project_ledger_entry_response(
                storage_obj,
                project_id=project_id,
                entry_id=entry_id,
            )
        )
