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
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.project_routes.shared import (
    extract_patch_payload,
    get_project_route_storage,
)
from supply_bot.projects.application.create_project_ledger_entry import (
    CreateProjectLedgerEntryCommand,
    CreateProjectLedgerEntryUseCase,
)
from supply_bot.projects.application.delete_project_ledger_entry import (
    DeleteProjectLedgerEntryCommand,
    DeleteProjectLedgerEntryUseCase,
)
from supply_bot.projects.application.list_project_ledger_entries import (
    ListProjectLedgerEntriesCommand,
    ListProjectLedgerEntriesUseCase,
)
from supply_bot.projects.application.update_project_ledger_entry import (
    UpdateProjectLedgerEntryCommand,
    UpdateProjectLedgerEntryUseCase,
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
        command = ListProjectLedgerEntriesCommand(project_id=project_id)
        return await resolve_application_result(ListProjectLedgerEntriesUseCase(storage_obj).execute(command))

    async def create_project_ledger_entry(
        request: Request,
        project_id: int,
        payload,
        sync_summary: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = CreateProjectLedgerEntryCommand(
            project_id=project_id,
            payload=payload,
            sync_summary=sync_summary,
        )
        return await resolve_application_result(CreateProjectLedgerEntryUseCase(storage_obj).execute(command))

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
        payload_data = extract_patch_payload(payload)
        command = UpdateProjectLedgerEntryCommand(
            project_id=project_id,
            entry_id=entry_id,
            payload_data=payload_data,
            counterparty_details=getattr(payload, "counterparty_details", None),
        )
        return await resolve_application_result(UpdateProjectLedgerEntryUseCase(storage_obj).execute(command))

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
        command = DeleteProjectLedgerEntryCommand(project_id=project_id, entry_id=entry_id)
        return await resolve_application_result(DeleteProjectLedgerEntryUseCase(storage_obj).execute(command))
