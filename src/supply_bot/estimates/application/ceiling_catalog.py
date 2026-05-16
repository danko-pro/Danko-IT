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
class CreateCeilingCatalogItemCommand:
    source_code: object
    title: object
    category: object
    unit: object
    work_price: object
    material_price: object
    equipment_price: object
    consumables_price: object
    price_factor: object
    quantity_source: object
    quantity_formula: object
    include_section: object
    package_code: object
    note: object
    is_active: object
    sort_order: object


@dataclass(frozen=True)
class UpdateCeilingCatalogItemCommand:
    item_id: int
    payload: dict[str, object]


class CeilingCatalogStorage(Protocol):
    async def create_estimate_ceiling_catalog_item(self, **kwargs: object) -> int: ...

    async def update_estimate_ceiling_catalog_item(self, item_id: int, **updates: object) -> object: ...

    async def get_estimate_ceiling_catalog_item(self, item_id: int) -> dict[str, Any] | None: ...


class CreateCeilingCatalogItemUseCase:
    def __init__(self, storage: CeilingCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: CreateCeilingCatalogItemCommand) -> int:
        return await self._storage.create_estimate_ceiling_catalog_item(
            source_code=_normalize_required_payload_text(
                command.source_code,
                error_message="Ceiling source code is required",
            ),
            title=_normalize_required_payload_text(command.title, error_message="Ceiling title is required"),
            category=_normalize_required_payload_text(command.category, error_message="Ceiling category is required"),
            unit=_normalize_required_payload_text(command.unit, error_message="Ceiling unit is required"),
            work_price=_clamp_payload_non_negative(command.work_price),
            material_price=_clamp_payload_non_negative(command.material_price),
            equipment_price=_clamp_payload_non_negative(command.equipment_price),
            consumables_price=_clamp_payload_non_negative(command.consumables_price),
            price_factor=clamp_factor(command.price_factor),
            quantity_source=_normalize_optional_payload_text(command.quantity_source),
            quantity_formula=_normalize_optional_payload_text(command.quantity_formula),
            include_section=_normalize_optional_payload_text(command.include_section) or "ceilings",
            package_code=_normalize_optional_payload_text(command.package_code),
            note=_normalize_optional_payload_text(command.note),
            is_active=bool(command.is_active),
            sort_order=max(0, int(command.sort_order or 100)),
        )


class UpdateCeilingCatalogItemUseCase:
    def __init__(self, storage: CeilingCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateCeilingCatalogItemCommand) -> dict[str, Any]:
        updates = _catalog_updates(command.payload)
        updated = await self._storage.update_estimate_ceiling_catalog_item(command.item_id, **updates)
        if not updated:
            raise ValueError("Ceiling catalog item not found")
        item = await self._storage.get_estimate_ceiling_catalog_item(command.item_id)
        if not item:
            raise ValueError("Ceiling catalog item not found")
        return item


def _catalog_updates(payload: dict[str, object]) -> dict[str, object]:
    updates: dict[str, object] = {}
    text_fields = {
        "source_code",
        "title",
        "category",
        "unit",
        "quantity_source",
        "quantity_formula",
        "include_section",
        "package_code",
        "note",
    }
    price_fields = {
        "work_price",
        "material_price",
        "equipment_price",
        "consumables_price",
        "price_factor",
    }
    for field in text_fields:
        if field in payload:
            updates[field] = _normalize_optional_payload_text(payload.get(field))
    for field in price_fields:
        if field in payload:
            updates[field] = (
                clamp_factor(payload.get(field))
                if field == "price_factor"
                else _clamp_payload_non_negative(payload.get(field))
            )
    if "is_active" in payload:
        updates["is_active"] = bool(payload.get("is_active"))
    if "sort_order" in payload:
        updates["sort_order"] = max(0, int(payload.get("sort_order") or 0))
    return updates


def _normalize_required_payload_text(value: object, *, error_message: str) -> str:
    return normalize_required_text(_normalize_optional_payload_text(value), error_message=error_message)


def _normalize_optional_payload_text(value: object) -> str | None:
    return normalize_optional_text(str(value or ""))


def _clamp_payload_non_negative(value: object) -> float:
    return clamp_non_negative(float(value or 0.0))
