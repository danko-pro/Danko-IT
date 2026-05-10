"""AI-маршруты для документов проектного ledger.

Маршрут читает уже загруженный invoice/act, запускает text extraction и применяет
полученные поля как reviewable metadata без автоматической пользовательской верификации.
"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request

from supply_bot.admin_api.auth import AdminSession
from supply_bot.admin_api.deps import require_admin_session
from supply_bot.admin_api.project_routes.document_transport import (
    read_document_storage_key,
    resolve_document_file_path_or_http,
)
from supply_bot.admin_api.project_routes.ledger_documents import ensure_supported_project_document_kind
from supply_bot.admin_api.project_routes.shared import (
    get_project_route_settings,
    get_project_route_storage,
    resolve_or_not_found,
    resolve_or_server_error,
)
from supply_bot.projects.access.contract_extraction_support import (
    ProjectDocumentTextExtractionError,
    extract_contract_text,
)
from supply_bot.projects.document_intelligence import ProjectLedgerDocumentExtractor, read_project_document_text
from supply_bot.projects.orchestration import (
    load_project_ledger_document_response,
    require_project,
    require_project_ledger_document,
    require_project_ledger_entry,
)
from supply_bot.projects.service import build_project_document_update_values


def register_project_ledger_document_ai_routes(app: FastAPI) -> None:
    """Регистрирует endpoint извлечения данных из ledger-документа."""

    @app.post("/api/projects/{project_id}/ledger/{entry_id}/documents/{kind}/extract")
    async def extract_project_ledger_document(
        request: Request,
        project_id: int,
        entry_id: int,
        kind: str,
        _session: AdminSession = Depends(require_admin_session),
    ) -> dict[str, Any]:
        """Извлекает title/date/amount из invoice или act и обновляет документ."""
        ensure_supported_project_document_kind(kind)

        # Route-слой только собирает зависимости и переводит ошибки в HTTP.
        storage_obj = get_project_route_storage(request)
        settings_obj = get_project_route_settings(request)
        await resolve_or_not_found(require_project(storage_obj, project_id))
        entry = await resolve_or_not_found(
            require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
        )
        document = await resolve_or_not_found(
            require_project_ledger_document(storage_obj, entry_id=entry_id, kind=kind)
        )

        # Текст документа может прийти из PDF/text reader или из OCR для изображений.
        file_path = resolve_document_file_path_or_http(
            settings_obj,
            storage_key=read_document_storage_key(document),
            missing_detail="Project document file not found",
        )
        try:
            document_text = await read_project_document_text(
                settings_obj,
                file_path,
                mime_type=str(document["source_mime_type"] or ""),
                text_reader=extract_contract_text,
            )
        except ProjectDocumentTextExtractionError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Failed to extract project document text") from exc

        if not document_text.strip():
            raise HTTPException(status_code=422, detail="Project document text is empty after extraction")

        # Результат AI не считается проверенным пользователем до ручного подтверждения в UI.
        extracted_document = await ProjectLedgerDocumentExtractor(settings_obj).extract_document(
            kind=kind,
            file_name=str(document["source_file_name"] or file_path.name),
            document_text=document_text,
        )
        if not extracted_document:
            raise HTTPException(status_code=502, detail="LLM did not return project document extraction result")

        updates = build_project_document_update_values(
            {
                **extracted_document,
                "extracted_by_ai": True,
                "verified_by_user": False,
            },
            kind=kind,
        )
        await storage_obj.update_project_ledger_document(ledger_entry_id=entry_id, kind=kind, **updates)
        return await resolve_or_server_error(
            load_project_ledger_document_response(
                storage_obj,
                entry=entry,
                entry_id=entry_id,
                kind=kind,
                error_detail="Project document extraction failed",
            )
        )
