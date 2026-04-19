"""Совместимый фасад маршрутов для договора проекта.

Реальная реализация теперь разрезана по сценариям:
- `contract_records.py` для данных договора и milestone;
- `contract_files.py` для upload/download/delete файла;
- `contract_ai.py` для AI extraction.
"""

from __future__ import annotations

from typing import Any, Callable

from fastapi import FastAPI

from supply_bot.admin_api.project_routes.contract_ai import register_project_contract_ai_routes
from supply_bot.admin_api.project_routes.contract_files import register_project_contract_file_routes
from supply_bot.admin_api.project_routes.contract_records import register_project_contract_record_routes


# Регистрация полного набора HTTP-маршрутов для contract-сценариев проекта.
def register_project_contract_routes(
    app: FastAPI,
    *,
    project_contract_update_payload_model,
    project_contract_milestone_update_payload_model,
    get_extract_contract_text: Callable[[], Any],
    get_project_contract_extractor_class: Callable[[], Any],
) -> None:
    register_project_contract_record_routes(
        app,
        project_contract_update_payload_model=project_contract_update_payload_model,
        project_contract_milestone_update_payload_model=project_contract_milestone_update_payload_model,
    )
    register_project_contract_file_routes(app)
    register_project_contract_ai_routes(
        app,
        get_extract_contract_text=get_extract_contract_text,
        get_project_contract_extractor_class=get_project_contract_extractor_class,
    )
