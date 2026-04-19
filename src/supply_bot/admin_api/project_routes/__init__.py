"""Регистрация HTTP-маршрутов для раздела проектов.

Подпакет разбит по зонам ответственности:
- `core` для CRUD самого проекта;
- `advances` для авансов;
- `ledger` для ledger и его документов;
- `contracts` для договоров и AI extraction;
- `shared` для преобразования доменных ошибок в HTTP.
"""

from __future__ import annotations

from fastapi import FastAPI

from supply_bot.admin_api.project_routes.advances import register_project_advance_routes
from supply_bot.admin_api.project_routes.contracts import register_project_contract_routes
from supply_bot.admin_api.project_routes.core import register_project_core_routes
from supply_bot.admin_api.project_routes.ledger import register_project_ledger_routes


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
    get_extract_contract_text,
    get_project_contract_extractor_class,
) -> None:
    register_project_core_routes(
        app,
        project_create_payload_model=project_create_payload_model,
        project_update_payload_model=project_update_payload_model,
    )
    register_project_advance_routes(
        app,
        project_advance_create_payload_model=project_advance_create_payload_model,
    )
    register_project_ledger_routes(
        app,
        project_ledger_entry_create_payload_model=project_ledger_entry_create_payload_model,
        project_ledger_entry_update_payload_model=project_ledger_entry_update_payload_model,
        project_ledger_document_update_payload_model=project_ledger_document_update_payload_model,
    )
    register_project_contract_routes(
        app,
        project_contract_update_payload_model=project_contract_update_payload_model,
        project_contract_milestone_update_payload_model=project_contract_milestone_update_payload_model,
        get_extract_contract_text=get_extract_contract_text,
        get_project_contract_extractor_class=get_project_contract_extractor_class,
    )
