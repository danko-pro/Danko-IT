"""Совместимый фасад маршрутов для project ledger.

Реальная реализация теперь разделена на два модуля:
- `ledger_entries.py` для самих записей ledger;
- `ledger_documents.py` для документов этих записей.

Так код route-слоя разрезан по use-case границам, а не живёт
единым крупным файлом.
"""

from __future__ import annotations

from fastapi import FastAPI

from supply_bot.admin_api.project_routes.ledger_document_ai import register_project_ledger_document_ai_routes
from supply_bot.admin_api.project_routes.ledger_documents import register_project_ledger_document_routes
from supply_bot.admin_api.project_routes.ledger_entries import register_project_ledger_entry_routes


# Регистрация полного набора HTTP-маршрутов для project ledger.
def register_project_ledger_routes(
    app: FastAPI,
    *,
    project_ledger_entry_create_payload_model,
    project_ledger_entry_update_payload_model,
    project_ledger_document_update_payload_model,
) -> None:
    register_project_ledger_entry_routes(
        app,
        project_ledger_entry_create_payload_model=project_ledger_entry_create_payload_model,
        project_ledger_entry_update_payload_model=project_ledger_entry_update_payload_model,
    )
    register_project_ledger_document_routes(
        app,
        project_ledger_document_update_payload_model=project_ledger_document_update_payload_model,
    )
    register_project_ledger_document_ai_routes(app)
