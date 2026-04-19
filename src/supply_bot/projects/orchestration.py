"""Совместимый фасад для сценариев работы с проектами.

Исторически весь orchestration-код жил в одном файле.
Теперь реальная логика разнесена по подпакету `projects.use_cases`:
- `lookups` для проверок и ошибок;
- `responses` для read-after-write;
- `mutations` для сценариев изменения данных.

Этот файл оставлен как публичная точка входа, чтобы не ломать
существующие импорты в route-слое и тестах.
"""

from __future__ import annotations

from supply_bot.projects.use_cases.lookups import (
    ProjectLookupError,
    ProjectOperationError,
    ensure_project_operation,
    require_estimate_project,
    require_project,
    require_project_advance,
    require_project_contract,
    require_project_contract_file,
    require_project_contract_milestone,
    require_project_ledger_document,
    require_project_ledger_entry,
)
from supply_bot.projects.use_cases.mutations import (
    apply_extracted_project_contract,
    create_project_advance_response,
    create_project_ledger_entry_response,
    delete_project_advance_response,
    delete_project_ledger_entry_response,
    update_project_contract_milestone_response,
    update_project_ledger_entry_response,
    upsert_project_contract_response,
)
from supply_bot.projects.use_cases.responses import (
    load_project_advance_response,
    load_project_contract_response,
    load_project_delete_response,
    load_project_ledger_document_response,
    load_project_ledger_entry_response,
    load_project_payload,
)

__all__ = [
    "ProjectLookupError",
    "ProjectOperationError",
    "apply_extracted_project_contract",
    "create_project_advance_response",
    "create_project_ledger_entry_response",
    "delete_project_advance_response",
    "delete_project_ledger_entry_response",
    "ensure_project_operation",
    "load_project_advance_response",
    "load_project_contract_response",
    "load_project_delete_response",
    "load_project_ledger_document_response",
    "load_project_ledger_entry_response",
    "load_project_payload",
    "require_estimate_project",
    "require_project",
    "require_project_advance",
    "require_project_contract",
    "require_project_contract_file",
    "require_project_contract_milestone",
    "require_project_ledger_document",
    "require_project_ledger_entry",
    "update_project_contract_milestone_response",
    "update_project_ledger_entry_response",
    "upsert_project_contract_response",
]
