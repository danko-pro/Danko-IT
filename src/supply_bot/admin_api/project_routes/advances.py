"""Маршруты для авансов проекта.

Здесь живёт только HTTP-слой для списка, создания и удаления авансов.
Вся доменная проверка и post-write orchestration вынесены ниже по слоям.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.shared import (
    get_project_route_storage,
    raise_bad_request,
    resolve_or_http_error,
    resolve_or_not_found,
)
from supply_bot.projects.orchestration import (
    create_project_advance_response,
    delete_project_advance_response,
    require_project,
)
from supply_bot.projects.service import (
    ProjectValidationError,
    build_project_advance_create_values,
    build_project_advance_payload,
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
        await resolve_or_not_found(require_project(storage_obj, project_id))
        advances = await storage_obj.list_project_advances(project_id)
        return [build_project_advance_payload(advance) for advance in advances]

    async def create_project_advance(
        request: Request,
        project_id: int,
        payload,
        sync_totals: bool = True,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)

        try:
            advance_values = build_project_advance_create_values(payload)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        return await resolve_or_http_error(
            create_project_advance_response(
                storage_obj,
                project_id=project_id,
                sync_totals=sync_totals,
                advance_values=advance_values,
            )
        )

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
        return await resolve_or_http_error(
            delete_project_advance_response(
                storage_obj,
                project_id=project_id,
                advance_id=advance_id,
            )
        )
