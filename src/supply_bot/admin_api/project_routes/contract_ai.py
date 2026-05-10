"""AI extraction route for project contracts."""

from __future__ import annotations

from typing import Any, Callable

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.document_transport import (
    read_document_storage_key,
    resolve_document_file_path_or_http,
)
from supply_bot.admin_api.project_routes.shared import (
    get_project_route_settings,
    get_project_route_storage,
    raise_bad_request,
    resolve_or_not_found,
    resolve_or_server_error,
)
from supply_bot.projects.access.contract_extraction_support import ProjectDocumentTextExtractionError
from supply_bot.projects.document_intelligence import read_project_document_text
from supply_bot.projects.orchestration import (
    apply_extracted_project_contract,
    require_project,
    require_project_contract_file,
)
from supply_bot.projects.service import ProjectValidationError


def register_project_contract_ai_routes(
    app: FastAPI,
    *,
    get_extract_contract_text: Callable[[], Any],
    get_project_contract_extractor_class: Callable[[], Any],
) -> None:
    @app.post("/api/projects/{project_id}/contract/extract")
    async def extract_project_contract(
        request: Request,
        project_id: int,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        settings_obj = get_project_route_settings(request)
        if not settings_obj.llm_enabled:
            raise HTTPException(status_code=503, detail="LLM extraction is not configured")

        storage_obj = get_project_route_storage(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        contract = await resolve_or_not_found(require_project_contract_file(storage_obj, project_id))

        file_path = resolve_document_file_path_or_http(
            settings_obj,
            storage_key=read_document_storage_key(contract),
            missing_detail="Project contract file not found",
        )

        extract_contract_text = get_extract_contract_text()
        try:
            contract_text = await read_project_document_text(
                settings_obj,
                file_path,
                mime_type=str(contract["source_mime_type"] or ""),
                text_reader=extract_contract_text,
            )
        except ProjectDocumentTextExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Failed to extract contract text") from exc

        if not contract_text.strip():
            raise HTTPException(status_code=422, detail="Contract text is empty after extraction")

        extractor_class = get_project_contract_extractor_class()
        extractor = extractor_class(settings_obj)
        extracted_contract = await extractor.extract_contract(
            file_name=str(contract["source_file_name"] or contract["file_name"] or file_path.name),
            contract_text=contract_text,
        )
        if not extracted_contract:
            raise HTTPException(status_code=502, detail="LLM did not return contract extraction result")

        try:
            return await resolve_or_server_error(
                apply_extracted_project_contract(
                    storage_obj,
                    project_id=project_id,
                    extracted_contract=extracted_contract,
                )
            )
        except ProjectValidationError as exc:
            raise_bad_request(exc)
