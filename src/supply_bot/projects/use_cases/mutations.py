"""Сценарии изменения данных по проектам.

Этот модуль координирует mutation-flow:
- выполняет обязательные проверки существования сущностей;
- вызывает storage-операции;
- после записи возвращает уже собранный актуальный payload.

Именно здесь живёт логика "что сделать после создания/обновления/удаления",
а не в route-слое.
"""

from __future__ import annotations

from typing import Any, Mapping

from supply_bot.projects.service import build_extracted_project_contract_values
from supply_bot.projects.use_cases.lookups import (
    ensure_project_operation,
    require_project,
    require_project_advance,
    require_project_contract,
    require_project_contract_milestone,
    require_project_ledger_entry,
)
from supply_bot.projects.use_cases.responses import (
    load_project_advance_response,
    load_project_contract_response,
    load_project_delete_response,
    load_project_ledger_entry_response,
)
from supply_bot.storage import BotStorage


# Mutation-flow для advances.
async def create_project_advance_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    sync_totals: bool,
    advance_values: Mapping[str, Any],
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    advance_id = await storage_obj.create_project_advance(
        project_id=project_id,
        sync_totals=sync_totals,
        **advance_values,
    )
    return await load_project_advance_response(
        storage_obj,
        project_id=project_id,
        advance_id=advance_id,
        error_detail="Project advance was not created",
    )


async def delete_project_advance_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    advance_id: int,
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    await require_project_advance(storage_obj, project_id=project_id, advance_id=advance_id)
    deleted_advance = await storage_obj.delete_project_advance(advance_id)
    ensure_project_operation(deleted_advance, "Project advance deletion failed")
    return await load_project_delete_response(
        storage_obj,
        project_id=project_id,
        deleted_key="advance_id",
        deleted_id=advance_id,
        error_detail="Project advance deletion failed",
    )


# Mutation-flow для ledger.
async def create_project_ledger_entry_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    sync_summary: bool,
    entry_values: Mapping[str, Any],
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    entry_id = await storage_obj.create_project_ledger_entry(
        project_id=project_id,
        sync_summary=sync_summary,
        **entry_values,
    )
    return await load_project_ledger_entry_response(
        storage_obj,
        project_id=project_id,
        entry_id=entry_id,
        error_detail="Project ledger entry was not created",
    )


async def update_project_ledger_entry_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entry_id: int,
    updates: Mapping[str, Any],
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    await require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
    await storage_obj.update_project_ledger_entry(entry_id, **updates)
    return await load_project_ledger_entry_response(
        storage_obj,
        project_id=project_id,
        entry_id=entry_id,
        error_detail="Project ledger entry update failed",
    )


async def delete_project_ledger_entry_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    entry_id: int,
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    await require_project_ledger_entry(storage_obj, project_id=project_id, entry_id=entry_id)
    deleted_entry = await storage_obj.delete_project_ledger_entry(entry_id)
    ensure_project_operation(deleted_entry, "Project ledger entry deletion failed")
    return await load_project_delete_response(
        storage_obj,
        project_id=project_id,
        deleted_key="entry_id",
        deleted_id=entry_id,
        error_detail="Project ledger entry deletion failed",
    )


# Mutation-flow для contract и AI extraction.
async def upsert_project_contract_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    contract_values: Mapping[str, Any],
    milestones_payload: list[dict[str, Any]],
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    contract_id = await storage_obj.upsert_project_contract(
        project_id=project_id,
        **contract_values,
    )
    await storage_obj.replace_project_contract_milestones(
        contract_id=contract_id,
        milestones=milestones_payload,
    )
    return await load_project_contract_response(
        storage_obj,
        project_id=project_id,
        error_detail="Project contract update failed",
    )


async def update_project_contract_milestone_response(
    storage_obj: BotStorage,
    *,
    project_id: int,
    milestone_id: int,
    updates: Mapping[str, Any],
) -> dict[str, Any]:
    await require_project(storage_obj, project_id)
    contract = await require_project_contract(storage_obj, project_id)
    await require_project_contract_milestone(
        storage_obj,
        contract_id=int(contract["id"]),
        milestone_id=milestone_id,
    )
    await storage_obj.update_project_contract_milestone(milestone_id, **updates)
    return await load_project_contract_response(
        storage_obj,
        project_id=project_id,
        error_detail="Project contract milestone update failed",
    )


async def apply_extracted_project_contract(
    storage_obj: BotStorage,
    *,
    project_id: int,
    extracted_contract: Mapping[str, Any],
) -> dict[str, Any]:
    existing_contract = await require_project_contract(storage_obj, project_id)

    contract_values, milestones_payload = build_extracted_project_contract_values(
        extracted_contract,
        existing_contract=existing_contract,
    )

    contract_id = await storage_obj.upsert_project_contract(
        project_id=project_id,
        **contract_values,
    )
    await storage_obj.replace_project_contract_milestones(
        contract_id=contract_id,
        milestones=milestones_payload,
    )

    return await load_project_contract_response(
        storage_obj,
        project_id=project_id,
        error_detail="Project contract extraction apply failed",
    )
