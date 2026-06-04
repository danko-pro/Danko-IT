from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, ValidationError
from supply_bot.estimates.application.flooring_assembly_catalog import FLOORING_ASSEMBLY_FORMULAS
from supply_bot.estimates.application.shared import (
    clamp_non_negative,
    normalize_required_text,
    require_positive_number,
)

FLOORING_CATALOG_ASSEMBLY_TARGET_KINDS = frozenset({"covering", "preparation", "layout"})
FLOORING_CATALOG_ASSEMBLY_VERSION = "flooring-assembly-v1"
FLOORING_CATALOG_ASSEMBLY_ROW_KINDS = frozenset({"material", "work", "consumable", "tool"})
FLOORING_CATALOG_ASSEMBLY_PUBLIC_CATEGORIES = frozenset({"materials", "works", "consumables", "tools"})
PUBLIC_CATEGORY_BY_KIND = {
    "material": "materials",
    "work": "works",
    "consumable": "consumables",
    "tool": "tools",
}
COVERING_ALLOWED_ROW_KINDS = frozenset({"material", "consumable", "tool"})
PREPARATION_ALLOWED_ROW_KINDS = frozenset({"work"})
LAYOUT_ALLOWED_ROW_KINDS = frozenset({"work"})

FLOORING_FLAT_UPDATE_BLOCKED_BY_ASSEMBLY = (
    "Flooring catalog row has an assembly; edit the assembly instead of flat fields"
)

FLOORING_FLAT_CATALOG_CREATE_BLOCKED = (
    "Flooring catalog rows must be created with a valid package assembly; use from-assembly create"
)


def reject_flooring_flat_catalog_create() -> None:
    """Reject flat-only catalog POST (PF4)."""

    raise ValidationError(FLOORING_FLAT_CATALOG_CREATE_BLOCKED)

_PACKAGE_AWARE_FORMULAS = frozenset(
    {
        "package_consumption",
        "layer_consumption",
        "piece_consumption",
        "kg_layer_consumption",
        "liquid_layers",
        "roll_meter_consumption",
        "sheet_area_consumption",
    }
)

_NUMERIC_UNIT_RE = re.compile(r"^\d+(?:[,.]\d+)?$")


def validate_flooring_catalog_assembly_target_kind(target_kind: str) -> str:
    normalized = (target_kind or "").strip()
    if normalized not in FLOORING_CATALOG_ASSEMBLY_TARGET_KINDS:
        raise ValidationError("Invalid flooring catalog assembly target_kind")
    return normalized


def validate_flooring_catalog_assembly_target_id(target_id: int) -> int:
    return int(require_positive_number(target_id, error_message="Invalid flooring catalog assembly target_id"))


@dataclass(frozen=True)
class FlooringCatalogAssemblyRowCommand:
    assembly_item_id: int | None
    section: str | None
    kind: str | None
    formula: str | None
    title: str | None
    unit: str | None
    price: float | int
    consumption_per_m2: float | int
    package_size: float | int | None
    layer_mm: float | int | None
    sort_order: int | None
    is_enabled: bool
    public_category: str | None
    public_title: str | None


@dataclass(frozen=True)
class ReplaceFlooringCatalogAssemblyCommand:
    target_kind: str
    target_id: int
    title: str | None
    version: str | None
    rows: list[FlooringCatalogAssemblyRowCommand]


class FlooringCatalogAssemblyStorage(Protocol):
    async def get_estimate_flooring_covering(self, covering_id: int) -> dict[str, Any] | None: ...

    async def get_estimate_flooring_preparation(self, preparation_id: int) -> dict[str, Any] | None: ...

    async def get_estimate_flooring_layout(self, layout_id: int) -> dict[str, Any] | None: ...

    async def get_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None: ...

    async def replace_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
        title: str,
        rows: list[dict[str, Any]],
        *,
        version: str = FLOORING_CATALOG_ASSEMBLY_VERSION,
        catalog_updates: dict[str, Any] | None = None,
    ) -> int: ...

    async def delete_estimate_flooring_catalog_assembly(self, target_kind: str, target_id: int) -> bool: ...


class GetFlooringCatalogAssemblyUseCase:
    def __init__(self, storage: FlooringCatalogAssemblyStorage) -> None:
        self._storage = storage

    async def execute(self, target_kind: str, target_id: int) -> dict[str, Any]:
        normalized_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
        normalized_id = validate_flooring_catalog_assembly_target_id(target_id)
        assembly = await self._storage.get_estimate_flooring_catalog_assembly(normalized_kind, normalized_id)
        if assembly is None:
            return empty_flooring_catalog_assembly_payload(normalized_kind, normalized_id)
        return serialize_flooring_catalog_assembly(assembly)


class ReplaceFlooringCatalogAssemblyUseCase:
    def __init__(self, storage: FlooringCatalogAssemblyStorage) -> None:
        self._storage = storage

    async def execute(self, command: ReplaceFlooringCatalogAssemblyCommand) -> dict[str, Any]:
        target_kind = validate_flooring_catalog_assembly_target_kind(command.target_kind)
        target_id = validate_flooring_catalog_assembly_target_id(command.target_id)
        await _ensure_flooring_catalog_target_exists(self._storage, target_kind, target_id)
        title = normalize_required_text(
            command.title,
            error_message="Flooring catalog assembly title is required",
        )
        version = _normalize_version(command.version)
        normalized_rows = _normalize_rows(command.rows or [], target_kind=target_kind)
        validate_flooring_package_for_publication(target_kind, normalized_rows)
        catalog_updates: dict[str, Any] | None = None
        if _has_enabled_assembly_rows(normalized_rows):
            from supply_bot.estimates.application.flooring_package_projection import (
                build_flooring_package_projection,
                catalog_update_values_from_projection,
            )

            projection = build_flooring_package_projection(target_kind, normalized_rows)
            catalog_updates = catalog_update_values_from_projection(
                target_kind,
                projection,
                assembly_rows=normalized_rows,
            )
        await self._storage.replace_estimate_flooring_catalog_assembly(
            target_kind,
            target_id,
            title,
            normalized_rows,
            version=version,
            catalog_updates=catalog_updates,
        )
        assembly = await self._storage.get_estimate_flooring_catalog_assembly(target_kind, target_id)
        if assembly is None:
            raise NotFoundError("Flooring catalog assembly was not saved")
        return serialize_flooring_catalog_assembly(assembly)


class DeleteFlooringCatalogAssemblyUseCase:
    def __init__(self, storage: FlooringCatalogAssemblyStorage) -> None:
        self._storage = storage

    async def execute(self, target_kind: str, target_id: int) -> None:
        normalized_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
        normalized_id = validate_flooring_catalog_assembly_target_id(target_id)
        deleted = await self._storage.delete_estimate_flooring_catalog_assembly(normalized_kind, normalized_id)
        if not deleted:
            raise NotFoundError("Flooring catalog assembly not found")


def empty_flooring_catalog_assembly_payload(target_kind: str, target_id: int) -> dict[str, Any]:
    return {
        "target_kind": target_kind,
        "target_id": target_id,
        "title": "",
        "version": FLOORING_CATALOG_ASSEMBLY_VERSION,
        "rows": [],
    }


def serialize_flooring_catalog_assembly(assembly: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": assembly["id"],
        "target_kind": assembly["target_kind"],
        "target_id": assembly["target_id"],
        "title": assembly["title"],
        "version": assembly.get("version") or FLOORING_CATALOG_ASSEMBLY_VERSION,
        "rows": list(assembly.get("rows") or []),
    }


async def reject_flooring_flat_update_when_assembly_present(
    storage: FlooringCatalogAssemblyStorage,
    target_kind: str,
    target_id: int,
) -> None:
    """Reject independent flat PATCH when an assembly record exists (FP3c)."""

    assembly = await storage.get_estimate_flooring_catalog_assembly(target_kind, target_id)
    if assembly is not None:
        raise ValidationError(FLOORING_FLAT_UPDATE_BLOCKED_BY_ASSEMBLY)


async def _ensure_flooring_catalog_target_exists(
    storage: FlooringCatalogAssemblyStorage,
    target_kind: str,
    target_id: int,
) -> None:
    if target_kind == "covering":
        target = await storage.get_estimate_flooring_covering(target_id)
        not_found_message = "Floor covering catalog item not found"
    elif target_kind == "preparation":
        target = await storage.get_estimate_flooring_preparation(target_id)
        not_found_message = "Floor preparation catalog item not found"
    else:
        target = await storage.get_estimate_flooring_layout(target_id)
        not_found_message = "Floor layout catalog item not found"
    if target is None:
        raise NotFoundError(not_found_message)


def _normalize_version(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or FLOORING_CATALOG_ASSEMBLY_VERSION


def _normalize_rows(
    rows: list[FlooringCatalogAssemblyRowCommand],
    *,
    target_kind: str,
) -> list[dict[str, Any]]:
    allowed_kinds = _allowed_row_kinds_for_target(target_kind)
    normalized_rows: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        kind = _required_enum(row.kind, FLOORING_CATALOG_ASSEMBLY_ROW_KINDS, "row kind")
        if kind not in allowed_kinds:
            raise ValidationError(f"Invalid flooring catalog assembly row kind for {target_kind}")
        public_category = _required_enum(
            row.public_category,
            FLOORING_CATALOG_ASSEMBLY_PUBLIC_CATEGORIES,
            "public category",
        )
        expected_category = PUBLIC_CATEGORY_BY_KIND[kind]
        if public_category != expected_category:
            raise ValidationError("Flooring catalog assembly public category must match row kind")
        normalized_rows.append(
            {
                "assembly_item_id": row.assembly_item_id,
                "section": normalize_required_text(row.section, error_message="Assembly row section is required"),
                "kind": kind,
                "formula": normalize_required_text(row.formula, error_message="Assembly row formula is required"),
                "title": normalize_required_text(row.title, error_message="Assembly row title is required"),
                "unit": _normalize_public_unit(row.unit),
                "price": clamp_non_negative(row.price),
                "consumption_per_m2": clamp_non_negative(row.consumption_per_m2),
                "package_size": _optional_non_negative(row.package_size),
                "layer_mm": _optional_non_negative(row.layer_mm),
                "sort_order": _normalize_sort_order(row.sort_order, index=index),
                "is_enabled": bool(row.is_enabled),
                "public_category": public_category,
                "public_title": (row.public_title or "").strip() or None,
            }
        )
    return normalized_rows


def _allowed_row_kinds_for_target(target_kind: str) -> frozenset[str]:
    if target_kind == "covering":
        return COVERING_ALLOWED_ROW_KINDS
    if target_kind == "preparation":
        return PREPARATION_ALLOWED_ROW_KINDS
    return LAYOUT_ALLOWED_ROW_KINDS


def _required_enum(value: str | None, allowed: frozenset[str], field: str) -> str:
    normalized = (value or "").strip()
    if normalized not in allowed:
        raise ValidationError(f"Invalid flooring catalog assembly {field}")
    return normalized


def _optional_non_negative(value: float | int | None) -> float | None:
    if value is None or value == "":
        return None
    return clamp_non_negative(value)


def _has_enabled_assembly_rows(rows: list[dict[str, Any]]) -> bool:
    return any(bool(row.get("is_enabled")) for row in rows)


def _normalize_sort_order(value: int | None, *, index: int) -> int:
    if value is None:
        return index * 10
    if isinstance(value, bool):
        raise ValidationError("Invalid flooring catalog assembly row sort order")
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError("Invalid flooring catalog assembly row sort order") from exc
    return normalized


def validate_flooring_package_for_publication(
    target_kind: str,
    rows: list[dict[str, Any]],
) -> None:
    """Reject empty, all-disabled, or structurally invalid flooring catalog assemblies."""

    if not rows:
        raise ValidationError("Flooring catalog assembly must have at least one row")

    enabled_rows = [row for row in rows if row.get("is_enabled")]
    if not enabled_rows:
        raise ValidationError("Flooring catalog assembly must have at least one enabled row")

    _validate_enabled_row_kinds_for_target(target_kind, enabled_rows)

    for row in enabled_rows:
        _validate_enabled_row_formula_params(target_kind, row)


def _validate_enabled_row_kinds_for_target(target_kind: str, enabled_rows: list[dict[str, Any]]) -> None:
    if target_kind == "covering":
        if not any(row.get("kind") == "material" for row in enabled_rows):
            raise ValidationError("Floor covering assembly requires at least one enabled material row")
        return
    if not any(row.get("kind") == "work" for row in enabled_rows):
        label = "preparation" if target_kind == "preparation" else "layout"
        raise ValidationError(f"Floor {label} assembly requires at least one enabled work row")


def _validate_enabled_row_formula_params(target_kind: str, row: dict[str, Any]) -> None:
    formula = (row.get("formula") or "").strip()
    if formula not in FLOORING_ASSEMBLY_FORMULAS:
        raise ValidationError("Invalid flooring catalog assembly row formula")
    _normalize_public_unit(row.get("unit"))

    price = _positive_number(row.get("price"), allow_zero=True)
    consumption = _positive_number(row.get("consumption_per_m2"), allow_zero=True)
    package_size = _positive_number(row.get("package_size"))
    layer_mm = _positive_number(row.get("layer_mm"))

    if target_kind == "layout" and row.get("kind") == "work" and price <= 0:
        raise ValidationError("Floor layout assembly work rows require price > 0")

    if formula == "unit_consumption":
        if consumption <= 0:
            raise ValidationError("Assembly row unit_consumption requires consumption_per_m2 > 0")
        return

    if formula == "flat_per_m2":
        return

    if formula in _PACKAGE_AWARE_FORMULAS:
        if consumption <= 0:
            raise ValidationError(f"Assembly row {formula} requires consumption_per_m2 > 0")
        if package_size <= 0:
            raise ValidationError(f"Assembly row {formula} requires package_size > 0")
        if price <= 0:
            raise ValidationError(f"Assembly row {formula} requires price > 0")
        if formula in {"layer_consumption", "kg_layer_consumption", "liquid_layers"} and layer_mm <= 0:
            raise ValidationError(f"Assembly row {formula} requires layer_mm > 0")


def _normalize_public_unit(value: Any) -> str:
    unit = normalize_required_text(value, error_message="Assembly row unit is required")
    if _NUMERIC_UNIT_RE.fullmatch(unit):
        raise ValidationError("Assembly row unit must be a measurement unit, not a number")
    return unit


def _positive_number(value: Any, *, allow_zero: bool = False) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, bool):
        return 0.0
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    if parsed < 0 or (not allow_zero and parsed <= 0):
        return 0.0
    return parsed
