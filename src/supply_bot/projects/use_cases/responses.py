"""Сборка ответов после чтения и мутаций по проектам.

Здесь находится логика read-after-write:
- загрузить свежую запись после изменения;
- достроить связанный payload проекта;
- собрать итоговый ответ для route-слоя.

Это позволяет маршрутам и mutation-flow не знать,
какие именно записи нужно перечитать после операции.
"""

from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.access.readers import (
    get_project_contract_payload,
    load_project_ledger_entry_documents,
)
from supply_bot.projects.service import (
    build_project_advance_payload,
    build_project_ledger_document_payload,
    build_project_ledger_entry_payload,
    build_project_payload,
)
from supply_bot.projects.use_cases.lookups import ensure_project_operation
from supply_bot.storage import BotStorage


# Базовые payload-ответы для проекта и связанных сущностей.
async def load_project_payload(
    storage_obj: BotStorage,
    *,
    project_id: int,
    error_detail: str,
) -> dict[str, Any]:
    project = await storage_obj.get_project(project_id)
    ensure_project_operation(project, error_detail)
    return build_project_payload(project)


async def load_project_advance_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    advance_id: int,
    error_detail: str,
) -> dict[str, Any]:
    advance = await storage_obj.get_project_advance(advance_id)
    ensure_project_operation(advance, error_detail)
    project_payload = await load_project_payload(
        storage_obj,
        project_id=project_id,
        error_detail=error_detail,
    )
    return {
        "advance": build_project_advance_payload(advance),
        "project": project_payload,
    }


async def load_project_delete_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    deleted_key: str,
    deleted_id: int,
    error_detail: str,
) -> dict[str, Any]:
    project_payload = await load_project_payload(
        storage_obj,
        project_id=project_id,
        error_detail=error_detail,
    )
    return {
        "deleted": True,
        deleted_key: deleted_id,
        "project": project_payload,
    }


async def load_project_ledger_entry_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entry_id: int,
    error_detail: str,
) -> dict[str, Any]:
    entry = await storage_obj.get_project_ledger_entry(entry_id)
    ensure_project_operation(entry, error_detail)
    project_payload = await load_project_payload(
        storage_obj,
        project_id=project_id,
        error_detail=error_detail,
    )
    invoice_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice")
    act_document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act")
    return {
        "entry": build_project_ledger_entry_payload(
            entry,
            invoice_document=invoice_document,
            act_document=act_document,
        ),
        "project": project_payload,
    }


async def load_project_contract_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    error_detail: str,
) -> dict[str, Any]:
    contract_payload = await get_project_contract_payload(storage_obj, project_id=project_id)
    ensure_project_operation(contract_payload, error_detail)
    return contract_payload


async def load_project_ledger_document_response(
    storage_obj: BotStorage,
    *,
    entry: Mapping[str, Any],
    entry_id: int,
    kind: str,
    error_detail: str,
    document_id: int | None = None,
) -> dict[str, Any]:
    document = await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind=kind)
    ensure_project_operation(document, error_detail)
    invoice_document, act_document = await load_project_ledger_entry_documents(
        storage_obj,
        entry_id=entry_id,
        kind=kind,
        current_document=document,
    )
    response = {
        "document": build_project_ledger_document_payload(document),
        "entry": build_project_ledger_entry_payload(
            entry,
            invoice_document=invoice_document,
            act_document=act_document,
        ),
    }
    if document_id is not None:
        response["document_id"] = document_id
    return response
