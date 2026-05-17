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
    raise_bad_request,
    resolve_or_not_found,
    resolve_or_server_error,
)
from supply_bot.projects.application.create_project import CreateProjectCommand, CreateProjectUseCase
from supply_bot.projects.application.get_project_detail import GetProjectDetailCommand, GetProjectDetailUseCase
from supply_bot.projects.application.list_projects import ListProjectsUseCase
from supply_bot.projects.orchestration import (
    load_project_payload,
    require_estimate_project,
    require_project,
)
from supply_bot.projects.service import (
    ProjectValidationError,
    build_project_payload,
    build_project_update_values,
)


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
        current = await resolve_or_not_found(require_project(storage_obj, project_id))

        payload_data = extract_patch_payload(payload)
        if not payload_data:
            return build_project_payload(current)

        if "estimate_project_id" in payload_data and payload_data["estimate_project_id"] is not None:
            await resolve_or_not_found(
                require_estimate_project(storage_obj, int(payload_data["estimate_project_id"]))
            )

        try:
            updates = build_project_update_values(payload_data)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        await storage_obj.update_project(project_id, **updates)
        return await resolve_or_server_error(
            load_project_payload(
                storage_obj,
                project_id=project_id,
                error_detail="Project update failed",
            )
        )

    update_project.__annotations__["payload"] = project_update_payload_model
    app.patch("/api/projects/{project_id}")(update_project)

    @app.delete("/api/projects/{project_id}")
    async def delete_project(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        await storage_obj.delete_project(project_id)
        return {"deleted": True, "project_id": project_id}
