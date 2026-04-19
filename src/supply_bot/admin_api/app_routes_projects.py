"""Совместимый фасад регистрации project routes.

Реальная раскладка маршрутов теперь живёт в подпакете
`admin_api.project_routes`, разбитом по зонам ответственности.
Этот файл оставлен как стабильная точка входа для app.py и тестов.

Важно: здесь также остаются экспортированы `extract_contract_text`
и `ProjectContractExtractor`, потому что на них завязаны тестовые patch'и.
"""

from __future__ import annotations

from fastapi import FastAPI

from supply_bot.admin_api.project_routes import register_project_routes as _register_project_routes
from supply_bot.projects.contract_extraction import ProjectContractExtractor, extract_contract_text


def register_project_routes(
    app: FastAPI,
    *,
    project_create_payload_model,
    project_update_payload_model,
    project_advance_create_payload_model,
    project_ledger_entry_create_payload_model,
    project_ledger_entry_update_payload_model,
    project_ledger_document_update_payload_model,
    project_contract_update_payload_model,
    project_contract_milestone_update_payload_model,
) -> None:
    _register_project_routes(
        app,
        project_create_payload_model=project_create_payload_model,
        project_update_payload_model=project_update_payload_model,
        project_advance_create_payload_model=project_advance_create_payload_model,
        project_ledger_entry_create_payload_model=project_ledger_entry_create_payload_model,
        project_ledger_entry_update_payload_model=project_ledger_entry_update_payload_model,
        project_ledger_document_update_payload_model=project_ledger_document_update_payload_model,
        project_contract_update_payload_model=project_contract_update_payload_model,
        project_contract_milestone_update_payload_model=project_contract_milestone_update_payload_model,
        get_extract_contract_text=lambda: extract_contract_text,
        get_project_contract_extractor_class=lambda: ProjectContractExtractor,
    )
