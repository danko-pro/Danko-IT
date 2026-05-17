"""CRUD маршруты для сущности проекта.

Модуль держит только HTTP-обвязку:
- читает request/payload;
- вызывает доменный/use-case слой;
- возвращает готовый API payload.
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
from supply_bot.projects.application.create_project import CreateProjectCommand, CreateProjectUseCase
from supply_bot.projects.application.delete_project import DeleteProjectCommand, DeleteProjectUseCase
from supply_bot.projects.application.get_project_detail import GetProjectDetailCommand, GetProjectDetailUseCase
from supply_bot.projects.application.list_projects import ListProjectsUseCase
from supply_bot.projects.application.update_project import UpdateProjectCommand, UpdateProjectUseCase


# Регистрация базовых CRUD-маршрутов проекта.
def register_project_core_routes(
    app: FastAPI,
    *,
    project_create_payload_model,
    project_update_payload_model,
) -> None:
    @app.get("/api/projects")
    async def list_projects(
        request: Request,
        _session: AdminSession = Depends(require_admin_session),
    ) -> list[dict[str, Any]]:
        storage_obj = get_project_route_storage(request)
        return await resolve_application_result(ListProjectsUseCase(storage_obj).execute())

    async def create_project(
        request: Request,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = CreateProjectCommand(payload=payload)
        return await resolve_application_result(CreateProjectUseCase(storage_obj).execute(command))

    create_project.__annotations__["payload"] = project_create_payload_model
    app.post("/api/projects")(create_project)

    @app.get("/api/projects/{project_id}")
    async def project_detail(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = GetProjectDetailCommand(project_id=project_id)
        return await resolve_application_result(GetProjectDetailUseCase(storage_obj).execute(command))

    async def update_project(
        request: Request,
        project_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        payload_data = extract_patch_payload(payload)
        command = UpdateProjectCommand(project_id=project_id, payload_data=payload_data)
        return await resolve_application_result(UpdateProjectUseCase(storage_obj).execute(command))

    update_project.__annotations__["payload"] = project_update_payload_model
    app.patch("/api/projects/{project_id}")(update_project)

    @app.delete("/api/projects/{project_id}")
    async def delete_project(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        command = DeleteProjectCommand(project_id=project_id)
        return await resolve_application_result(DeleteProjectUseCase(storage_obj).execute(command))
