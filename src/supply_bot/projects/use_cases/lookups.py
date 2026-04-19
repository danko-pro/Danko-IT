"""Проверки и ошибки для сценариев работы с проектами.

Этот модуль отвечает за две вещи:
1. Даёт единые ошибки для слоя orchestration/use cases.
2. Содержит guard-функции, которые проверяют существование сущностей
   проекта и возвращают уже валидные записи из storage.

Маршруты и mutation-flow не должны повторять эти проверки вручную.
Они вызывают функции из этого модуля и получают либо корректную сущность,
либо понятную доменную ошибку.
"""

from __future__ import annotations

from typing import Any, Mapping

from supply_bot.storage import BotStorage


# Ошибки use-case слоя. Их затем переводит в HTTP слой project_routes/shared.py.
class ProjectLookupError(LookupError):
    pass


class ProjectOperationError(RuntimeError):
    pass


# Общий guard для проверок post-write/read-after-write.
def ensure_project_operation(value: object, detail: str) -> None:
    if not value:
        raise ProjectOperationError(detail)


# Проверки существования связанных сущностей проекта.
async def require_estimate_project(
    storage_obj: BotStorage,
    estimate_project_id: int,
) -> Mapping[str, Any]:
    estimate_project = await storage_obj.get_estimate_project(estimate_project_id)
    if not estimate_project:
        raise ProjectLookupError("Linked calculator project not found")
    return estimate_project


async def require_project(
    storage_obj: BotStorage,
    project_id: int,
) -> Mapping[str, Any]:
    project = await storage_obj.get_project(project_id)
    if not project:
        raise ProjectLookupError("Project not found")
    return project


async def require_project_advance(
    storage_obj: BotStorage,
    *,
    project_id: int,
    advance_id: int,
) -> Mapping[str, Any]:
    advance = await storage_obj.get_project_advance(advance_id)
    if not advance or int(advance["project_id"]) != project_id:
        raise ProjectLookupError("Project advance not found")
    return advance


async def require_project_ledger_entry(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entry_id: int,
) -> Mapping[str, Any]:
    entry = await storage_obj.get_project_ledger_entry(entry_id)
    if not entry or int(entry["project_id"]) != project_id:
        raise ProjectLookupError("Project ledger entry not found")
    return entry


async def require_project_contract(
    storage_obj: BotStorage,
    project_id: int,
) -> Mapping[str, Any]:
    contract = await storage_obj.get_project_contract(project_id)
    if not contract:
        raise ProjectLookupError("Project contract not found")
    return contract


async def require_project_contract_file(
    storage_obj: BotStorage,
    project_id: int,
) -> Mapping[str, Any]:
    contract = await require_project_contract(storage_obj, project_id)
    if not contract["source_storage_key"]:
        raise ProjectLookupError("Project contract file not found")
    return contract


async def require_project_contract_milestone(
    storage_obj: BotStorage,
    *,
    contract_id: int,
    milestone_id: int,
) -> Mapping[str, Any]:
    milestone = await storage_obj.get_project_contract_milestone(milestone_id)
    if not milestone or int(milestone["contract_id"]) != contract_id:
        raise ProjectLookupError("Project contract milestone not found")
    return milestone


async def require_project_ledger_document(
    storage_obj: BotStorage,
    *,
    entry_id: int,
    kind: str,
) -> Mapping[str, Any]:
    document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
    if not document:
        raise ProjectLookupError("Project document not found")
    return document
