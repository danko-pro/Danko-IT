from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.shared import clamp_non_negative, normalize_optional_text, normalize_required_text

FLOORING_ASSEMBLY_SECTIONS = frozenset({"covering", "work", "preparation", "consumable", "tool"})
FLOORING_ASSEMBLY_KINDS = frozenset({"work", "material", "consumable", "tool"})
FLOORING_ASSEMBLY_FORMULAS = frozenset(
    {
        "flat_per_m2",
        "unit_consumption",
        "package_consumption",
        "layer_consumption",
        "piece_consumption",
        "kg_layer_consumption",
        "liquid_layers",
        "roll_meter_consumption",
        "sheet_area_consumption",
        "fixed_area_allocation",
    }
)


@dataclass(frozen=True)
class FlooringAssemblyItemCommand:
    source_code: str | None
    section: str | None
    title: str | None
    kind: str | None
    formula: str | None
    unit: str | None
    price: float | int
    consumption_per_m2: float | int
    package_size: float | int | None
    layer_mm: float | int | None
    note: str | None
    sort_order: int | None = None


@dataclass(frozen=True)
class UpdateFlooringAssemblyItemCommand(FlooringAssemblyItemCommand):
    item_id: int = 0


class FlooringAssemblyCatalogStorage(Protocol):
    async def create_estimate_flooring_assembly_item(self, **values: Any) -> int: ...

    async def get_estimate_flooring_assembly_item(self, item_id: int) -> dict[str, Any] | None: ...

    async def update_estimate_flooring_assembly_item(self, item_id: int, **values: Any) -> bool: ...


class CreateFlooringAssemblyItemUseCase:
    def __init__(self, storage: FlooringAssemblyCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: FlooringAssemblyItemCommand) -> int:
        values = _normalize_command(command)
        return await self._storage.create_estimate_flooring_assembly_item(**values)


class UpdateFlooringAssemblyItemUseCase:
    def __init__(self, storage: FlooringAssemblyCatalogStorage) -> None:
        self._storage = storage

    async def execute(self, command: UpdateFlooringAssemblyItemCommand) -> dict[str, Any]:
        values = _normalize_command(command)
        updated = await self._storage.update_estimate_flooring_assembly_item(command.item_id, **values)
        if not updated:
            raise NotFoundError("Flooring assembly item not found")
        item = await self._storage.get_estimate_flooring_assembly_item(command.item_id)
        if not item:
            raise NotFoundError("Flooring assembly item not found")
        return item


def _normalize_command(command: FlooringAssemblyItemCommand) -> dict[str, Any]:
    title = _required(command.title, "Flooring assembly item title is required")
    section = _enum(command.section, FLOORING_ASSEMBLY_SECTIONS, "section")
    kind = _enum(command.kind, FLOORING_ASSEMBLY_KINDS, "kind")
    formula = _enum(command.formula, FLOORING_ASSEMBLY_FORMULAS, "formula")
    source_code = _source_code(command.source_code, section=section, title=title)
    return {
        "source_code": source_code,
        "section": section,
        "title": title,
        "kind": kind,
        "formula": formula,
        "unit": (command.unit or "").strip() or "pcs",
        "price": clamp_non_negative(command.price),
        "consumption_per_m2": clamp_non_negative(command.consumption_per_m2),
        "package_size": _optional_non_negative(command.package_size),
        "layer_mm": _optional_non_negative(command.layer_mm),
        "note": normalize_optional_text(command.note),
        "sort_order": int(command.sort_order or 100),
    }


def _required(value: str | None, error_message: str) -> str:
    try:
        return normalize_required_text(value, error_message=error_message)
    except ValueError as exc:
        raise ValidationError(str(exc)) from exc


def _enum(value: str | None, allowed: frozenset[str], field: str) -> str:
    normalized = (value or "").strip()
    if normalized not in allowed:
        raise ValidationError(f"Invalid flooring assembly {field}")
    return normalized


def _optional_non_negative(value: float | int | None) -> float | None:
    if value is None or value == "":
        return None
    return clamp_non_negative(value)


def _source_code(value: str | None, *, section: str, title: str) -> str:
    raw = (value or "").strip()
    if raw:
        return raw
    slug = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
    if not slug:
        digest = hashlib.sha256(title.encode("utf-8")).hexdigest()[:8]
        slug = f"custom_{digest}"
    return f"{section}_{slug}"
