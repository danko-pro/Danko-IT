"""Маршруты для авансов проекта.

Здесь живёт только HTTP-слой для списка, создания и удаления авансов.
Вся доменная проверка и post-write orchestration вынесены ниже по слоям.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.admin_api.project_routes.shared import get_project_route_storage
from supply_bot.projects.application.create_project_advance import (
    CreateProjectAdvanceCommand,
    CreateProjectAdvanceUseCase,
)
from supply_bot.projects.application.delete_project_advance import (
    DeleteProjectAdvanceCommand,
    DeleteProjectAdvanceUseCase,
)
from supply_bot.projects.application.list_project_advances import (
    ListProjectAdvancesCommand,
    ListProjectAdvancesUseCase,
)


# Регистрация HTTP-маршрутов для project advances.
def register_project_advance_routes(
    app: FastAPI,
    *,
    project_advance_create_payload_model,
) -> None:
    @app.get("/api/projects/{project_id}/advances")
    async def list_project_advances(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_project_route_storage(request)
        command = ListProjectAdvancesCommand(project_id=project_id)
        return await resolve_application_result(ListProjectAdvancesUseCase(storage_obj).execute(command))

    async def create_project_advance(
        request: Request,
        project_id: int,
        payload,
        sync_totals: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = CreateProjectAdvanceCommand(
            project_id=project_id,
            payload=payload,
            sync_totals=sync_totals,
        )
        return await resolve_application_result(CreateProjectAdvanceUseCase(storage_obj).execute(command))

    create_project_advance.__annotations__["payload"] = project_advance_create_payload_model
    app.post("/api/projects/{project_id}/advances")(create_project_advance)

    @app.delete("/api/projects/{project_id}/advances/{advance_id}")
    async def delete_project_advance(
        request: Request,
        project_id: int,
        advance_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = DeleteProjectAdvanceCommand(
            project_id=project_id,
            advance_id=advance_id,
        )
        return await resolve_application_result(DeleteProjectAdvanceUseCase(storage_obj).execute(command))
