"""Read-side helpers для проектов.

Модуль отвечает за безопасное чтение связанных данных из storage
и сборку составных payload:
- список ledger entry вместе с их документами;
- договор проекта вместе с milestone-этапами.
"""

from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.service import (
    build_project_contract_milestone_payload,
    build_project_contract_payload,
    build_project_ledger_entry_payload,
)
from supply_bot.storage import BotStorage


# Внутренние read helpers для ledger.
async def _build_project_ledger_documents_map(
    storage_obj: BotStorage,
    *,
    project_id: int,
) -> dict[int, dict[str, dict[str, Any]]]:
    documents = await storage_obj.list_project_ledger_documents(project_id)
    result: dict[int, dict[str, dict[str, Any]]] = {}
    for document in documents:
        result.setdefault(int(document["ledger_entry_id"]), {})[str(document["kind"])] = document
    return result


async def build_project_ledger_payloads(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entries: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    documents_by_entry = await _build_project_ledger_documents_map(storage_obj, project_id=project_id)
    return [
        build_project_ledger_entry_payload(
            entry,
            invoice_document=documents_by_entry.get(int(entry["id"]), {}).get("invoice"),
            act_document=documents_by_entry.get(int(entry["id"]), {}).get("act"),
        )
        for entry in entries
    ]


async def load_project_ledger_entry_documents(
    storage_obj: BotStorage,
    *,
    entry_id: int,
    kind: str,
    current_document: Mapping[str, Any],
) -> tuple[Mapping[str, Any] | None, Mapping[str, Any] | None]:
    invoice_document = (
        current_document
        if kind == "invoice"
        else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="invoice")
    )
    act_document = (
        current_document
        if kind == "act"
        else await storage_obj.get_project_ledger_document(ledger_entry_id=entry_id, kind="act")
    )
    return invoice_document, act_document


# Отдельный read helper для договора проекта.
async def get_project_contract_payload(
    storage_obj: BotStorage,
    *,
    project_id: int,
) -> dict[str, Any] | None:
    contract = await storage_obj.get_project_contract(project_id)
    if not contract:
        return None

    milestones = await storage_obj.list_project_contract_milestones(int(contract["id"]))
    return build_project_contract_payload(
        contract,
        milestones=[build_project_contract_milestone_payload(milestone) for milestone in milestones],
    )
