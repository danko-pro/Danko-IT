"""Маршруты для данных договора без работы с файлами и AI.

Здесь живут сценарии:
- получить договор проекта;
- обновить/создать его данные;
- обновить milestone-этап договора.
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
    resolve_or_server_error,
)
from supply_bot.projects.access.readers import get_project_contract_payload
from supply_bot.projects.orchestration import (
    load_project_contract_response,
    require_project,
    require_project_contract,
    update_project_contract_milestone_response,
    upsert_project_contract_response,
)
from supply_bot.projects.service import (
    ProjectValidationError,
    build_project_contract_milestone_update_values,
    build_project_contract_milestones_values,
    build_project_contract_upsert_values,
)


# Регистрация HTTP-маршрутов для данных договора.
def register_project_contract_record_routes(
    app: FastAPI,
    *,
    project_contract_update_payload_model,
    project_contract_milestone_update_payload_model,
) -> None:
    @app.get("/api/projects/{project_id}/contract")
    async def get_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any] | None:
        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        return await get_project_contract_payload(storage_obj, project_id=project_id)

    async def upsert_project_contract(
        request: Request,
        project_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)

        existing_contract = await storage_obj.get_project_contract(project_id)
        payload_data = payload.model_dump()

        try:
            contract_values = build_project_contract_upsert_values(
                payload_data,
                existing_contract=existing_contract,
            )
            milestones_payload = build_project_contract_milestones_values(payload.milestones)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        return await resolve_or_http_error(
            upsert_project_contract_response(
                storage_obj,
                project_id=project_id,
                contract_values=contract_values,
                milestones_payload=milestones_payload,
            )
        )

    upsert_project_contract.__annotations__["payload"] = project_contract_update_payload_model
    app.put("/api/projects/{project_id}/contract")(upsert_project_contract)

    async def update_project_contract_milestone(
        request: Request,
        project_id: int,
        milestone_id: int,
        payload,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        await resolve_or_not_found(require_project_contract(storage_obj, project_id))

        payload_data = extract_patch_payload(payload)
        if not payload_data:
            return await resolve_or_server_error(
                load_project_contract_response(
                    storage_obj,
                    project_id=project_id,
                    error_detail="Project contract lookup failed",
                )
            )

        try:
            updates = build_project_contract_milestone_update_values(payload_data)
        except ProjectValidationError as exc:
            raise_bad_request(exc)

        return await resolve_or_http_error(
            update_project_contract_milestone_response(
                storage_obj,
                project_id=project_id,
                milestone_id=milestone_id,
                updates=updates,
            )
        )

    update_project_contract_milestone.__annotations__["payload"] = (
        project_contract_milestone_update_payload_model
    )
    app.patch("/api/projects/{project_id}/contract/milestones/{milestone_id}")(update_project_contract_milestone)
