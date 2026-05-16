from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.estimates.application.shared import (
    clamp_factor,
    clamp_non_negative,
    normalize_optional_text,
    normalize_required_text,
)


@dataclass(frozen=True)
class CeilingProjectItemValuesCommand:
    room_id: object
    source_catalog_item_id: object
    source_code_snapshot: object
    title_snapshot: object
    category_snapshot: object
    unit_snapshot: object
    quantity: object
    quantity_source: object
    quantity_formula_snapshot: object
    work_price_snapshot: object
    material_price_snapshot: object
    equipment_price_snapshot: object
    consumables_price_snapshot: object
    price_factor_snapshot: object
    work_total: object
    material_total: object
    equipment_total: object
    consumables_total: object
    total: object
    note_snapshot: object
    is_enabled: object
    sort_order: object


@dataclass(frozen=True)
class CreateCeilingProjectItemCommand:
    project_id: int
    item: CeilingProjectItemValuesCommand


@dataclass(frozen=True)
class UpdateCeilingProjectItemCommand:
    item_id: int
    project_id: int | None
    item: CeilingProjectItemValuesCommand


@dataclass(frozen=True)
class DeleteCeilingProjectItemCommand:
    item_id: int


class CeilingProjectItemStorage(Protocol):
    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None: ...

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]: ...

    async def get_estimate_ceiling_catalog_item(self, item_id: int) -> dict[str, Any] | None: ...

    async def create_estimate_project_ceiling_item(self, *, project_id: int, **kwargs: object) -> int | None: ...

    async def update_estimate_project_ceiling_item(self, item_id: int, **kwargs: object) -> int | None: ...

    async def delete_estimate_project_ceiling_item(self, item_id: int) -> int | None: ...


class CreateCeilingProjectItemUseCase:
    def __init__(self, storage: CeilingProjectItemStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateCeilingProjectItemCommand) -> int:
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise ValueError("Calculator project not found")
        await _validate_project_item_refs(self._storage, command.project_id, command.item)
        item_id = await self._storage.create_estimate_project_ceiling_item(
            project_id=command.project_id,
            **_project_item_values(command.item),
        )
        if not item_id:
            raise ValueError("Calculator project not found")
        return command.project_id


class UpdateCeilingProjectItemUseCase:
    def __init__(self, storage: CeilingProjectItemStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateCeilingProjectItemCommand) -> int:
        if command.project_id is None:
            raise ValueError("Ceiling project_id is required")
        project = await self._storage.get_estimate_project(command.project_id)
        if not project:
            raise ValueError("Calculator project not found")
        await _validate_project_item_refs(self._storage, command.project_id, command.item)
        updated_project_id = await self._storage.update_estimate_project_ceiling_item(
            command.item_id,
            **_project_item_values(command.item),
        )
        if updated_project_id is None:
            raise ValueError("Ceiling project item not found")
        return int(updated_project_id)


class DeleteCeilingProjectItemUseCase:
    def __init__(self, storage: CeilingProjectItemStorage) -> None:
        self._storage = storage

    async def execute(self, command: DeleteCeilingProjectItemCommand) -> int:
        project_id = await self._storage.delete_estimate_project_ceiling_item(command.item_id)
        if project_id is None:
            raise ValueError("Ceiling project item not found")
        return int(project_id)


async def _validate_project_item_refs(
    storage: CeilingProjectItemStorage,
    project_id: int,
    item: CeilingProjectItemValuesCommand,
) -> None:
    if item.room_id is not None:
        room_ids = {int(room["id"]) for room in await storage.list_estimate_rooms(project_id)}
        if int(item.room_id) not in room_ids:
            raise ValueError("Unknown ceiling room selected")
    if item.source_catalog_item_id is not None:
        catalog_item = await storage.get_estimate_ceiling_catalog_item(int(item.source_catalog_item_id))
        if not catalog_item:
            raise ValueError("Unknown ceiling catalog item selected")


def _project_item_values(item: CeilingProjectItemValuesCommand) -> dict[str, object]:
    return {
        "room_id": item.room_id,
        "source_catalog_item_id": item.source_catalog_item_id,
        "source_code_snapshot": _normalize_optional_payload_text(item.source_code_snapshot),
        "title_snapshot": _normalize_required_payload_text(
            item.title_snapshot,
            error_message="Ceiling title is required",
        ),
        "category_snapshot": _normalize_optional_payload_text(item.category_snapshot),
        "unit_snapshot": _normalize_required_payload_text(item.unit_snapshot, error_message="Ceiling unit is required"),
        "quantity": _clamp_payload_non_negative(item.quantity),
        "quantity_source": _normalize_optional_payload_text(item.quantity_source) or "manual",
        "quantity_formula_snapshot": _normalize_optional_payload_text(item.quantity_formula_snapshot),
        "work_price_snapshot": _clamp_payload_non_negative(item.work_price_snapshot),
        "material_price_snapshot": _clamp_payload_non_negative(item.material_price_snapshot),
        "equipment_price_snapshot": _clamp_payload_non_negative(item.equipment_price_snapshot),
        "consumables_price_snapshot": _clamp_payload_non_negative(item.consumables_price_snapshot),
        "price_factor_snapshot": clamp_factor(item.price_factor_snapshot),
        "work_total": _clamp_payload_non_negative(item.work_total),
        "material_total": _clamp_payload_non_negative(item.material_total),
        "equipment_total": _clamp_payload_non_negative(item.equipment_total),
        "consumables_total": _clamp_payload_non_negative(item.consumables_total),
        "total": _clamp_payload_non_negative(item.total),
        "note_snapshot": _normalize_optional_payload_text(item.note_snapshot),
        "is_enabled": bool(item.is_enabled),
        "sort_order": max(0, int(item.sort_order or 100)),
    }


def _normalize_required_payload_text(value: object, *, error_message: str) -> str:
    return normalize_required_text(_normalize_optional_payload_text(value), error_message=error_message)


def _normalize_optional_payload_text(value: object) -> str | None:
    return normalize_optional_text(str(value or ""))


def _clamp_payload_non_negative(value: object) -> float:
    return clamp_non_negative(float(value or 0.0))
