from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from supply_bot.estimates.application.flooring_catalog_assembly import (
    FLOORING_CATALOG_ASSEMBLY_VERSION,
    validate_flooring_catalog_assembly_target_kind,
    validate_flooring_package_for_publication,
)
from supply_bot.estimates.application.flooring_package_projection import (
    build_flooring_package_projection,
    catalog_update_values_from_projection,
)
from supply_bot.utils import normalize_text

DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2 = 220.0

# Standard retail pack sizes for PF2 synthetic rows derived from flat CRM columns.
_SYNTHETIC_CONSUMABLE_PACKAGE_DEFAULTS: dict[str, tuple[str, float]] = {
    "клей": ("package_consumption", 25.0),
    "грунт": ("package_consumption", 10.0),
    "свп": ("piece_consumption", 500.0),
    "затирка": ("package_consumption", 5.0),
}

FLOORING_SYNTHETIC_ASSEMBLY_VERSION = FLOORING_CATALOG_ASSEMBLY_VERSION
FLOORING_SYNTHETIC_ASSEMBLY_TITLE_SUFFIX = "(технический пакет PF2)"


@dataclass(frozen=True)
class SyntheticFlooringCatalogAssemblyPayload:
    title: str
    version: str
    rows: list[dict[str, Any]]


def build_synthetic_flooring_catalog_assembly(
    target_kind: str,
    catalog_row: Mapping[str, Any],
) -> SyntheticFlooringCatalogAssemblyPayload:
    """Build a valid technical assembly payload from legacy flat catalog columns."""

    normalized_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
    title = _catalog_title(catalog_row)
    assembly_title = f"{title} {FLOORING_SYNTHETIC_ASSEMBLY_TITLE_SUFFIX}".strip()

    if normalized_kind == "covering":
        rows = _covering_synthetic_rows(catalog_row)
    elif normalized_kind == "preparation":
        rows = _preparation_synthetic_rows(catalog_row)
    else:
        rows = _layout_synthetic_rows(catalog_row)

    validate_flooring_package_for_publication(normalized_kind, rows)
    return SyntheticFlooringCatalogAssemblyPayload(
        title=assembly_title,
        version=FLOORING_SYNTHETIC_ASSEMBLY_VERSION,
        rows=rows,
    )


def catalog_updates_for_synthetic_assembly(
    target_kind: str,
    catalog_row: Mapping[str, Any],
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    """Map synthetic assembly projection to catalog columns, preserving unmigrated buckets."""

    normalized_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
    projection = build_flooring_package_projection(normalized_kind, rows)
    updates = catalog_update_values_from_projection(
        normalized_kind,
        projection,
        assembly_rows=rows,
    )

    if normalized_kind == "preparation":
        # Preparation assemblies are work-only; material stays on flat columns for public totals.
        updates["material_price_per_m2"] = _non_negative(catalog_row.get("material_price_per_m2"))

    return updates


def covering_flat_buckets_from_catalog_row(row: Mapping[str, Any]) -> dict[str, float]:
    return {
        "materialPricePerM2": _non_negative(row.get("material_price_per_m2")),
        "laborPricePerM2": _non_negative(row.get("labor_price_per_m2")),
        "adhesivePricePerM2": _consumable_price_per_m2(
            row.get("glue_consumption_per_m2"),
            row.get("glue_price_per_unit"),
        ),
        "primerPricePerM2": _consumable_price_per_m2(
            row.get("primer_consumption_per_m2"),
            row.get("primer_price_per_unit"),
        ),
        "svpPricePerM2": _consumable_price_per_m2(
            row.get("svp_consumption_per_m2"),
            row.get("svp_price_per_unit"),
        ),
        "groutPricePerM2": _consumable_price_per_m2(
            row.get("grout_consumption_per_m2"),
            row.get("grout_price_per_unit"),
        ),
        "toolConsumablesPerM2": _non_negative(row.get("instrument_price_per_m2")),
    }


def preparation_flat_buckets_from_catalog_row(row: Mapping[str, Any]) -> dict[str, float]:
    return {
        "laborPricePerM2": _non_negative(row.get("labor_price_per_m2")),
        "materialPricePerM2": _non_negative(row.get("material_price_per_m2")),
    }


def layout_flat_buckets_from_catalog_row(row: Mapping[str, Any]) -> dict[str, float]:
    labor_multiplier = _positive_or_one(row.get("labor_multiplier"))
    labor_price_per_m2 = _non_negative(row.get("labor_price_per_m2"))
    return {
        "laborPricePerM2": round(labor_price_per_m2 * labor_multiplier, 6),
        "laborMultiplier": labor_multiplier,
    }


def flat_buckets_are_equivalent(
    expected: Mapping[str, float],
    actual: Mapping[str, float],
    *,
    keys: tuple[str, ...],
    tolerance: float = 1e-4,
) -> bool:
    for key in keys:
        if abs(_non_negative(expected.get(key)) - _non_negative(actual.get(key))) > tolerance:
            return False
    return True


def _covering_synthetic_rows(row: Mapping[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    sort_order = 10
    title = _catalog_title(row)

    rows.append(
        _base_row(
            section="covering",
            kind="material",
            formula="flat_per_m2",
            title=title,
            unit="m2",
            price=_non_negative(row.get("material_price_per_m2")),
            consumption_per_m2=1,
            public_category="materials",
            public_title=title,
            sort_order=sort_order,
        )
    )
    sort_order += 10

    underlay_mode = normalize_text(str(row.get("underlay_mode") or "")) or "none"
    if underlay_mode != "none":
        underlay_consumption = _non_negative(row.get("underlay_consumption_per_m2")) or 1.0
        rows.append(
            _base_row(
                section="consumable",
                kind="consumable",
                formula="unit_consumption",
                title="Подложка",
                unit="m2",
                price=DEFAULT_PUBLIC_UNDERLAY_PRICE_PER_M2,
                consumption_per_m2=underlay_consumption,
                public_category="consumables",
                public_title="Подложка",
                sort_order=sort_order,
            )
        )
        sort_order += 10

    consumables = (
        ("Клей", row.get("glue_unit"), row.get("glue_consumption_per_m2"), row.get("glue_price_per_unit")),
        ("Грунт", row.get("primer_unit"), row.get("primer_consumption_per_m2"), row.get("primer_price_per_unit")),
        ("СВП", row.get("svp_unit"), row.get("svp_consumption_per_m2"), row.get("svp_price_per_unit")),
        ("Затирка", row.get("grout_unit"), row.get("grout_consumption_per_m2"), row.get("grout_price_per_unit")),
    )
    for consumable_title, unit, consumption, price_per_unit in consumables:
        consumable_row = _consumable_row_from_flat_fields(
            title=consumable_title,
            unit=_text(unit) or "pcs",
            consumption_per_m2=consumption,
            price_per_unit=price_per_unit,
            sort_order=sort_order,
        )
        if consumable_row is not None:
            rows.append(consumable_row)
            sort_order += 10

    instrument_price = _non_negative(row.get("instrument_price_per_m2"))
    if instrument_price > 0:
        rows.append(
            _base_row(
                section="tool",
                kind="tool",
                formula="flat_per_m2",
                title="Инструмент и мелкий расходник",
                unit="m2",
                price=instrument_price,
                consumption_per_m2=1,
                public_category="tools",
                public_title="Инструмент и мелкий расходник",
                sort_order=sort_order,
            )
        )

    return rows


def _preparation_synthetic_rows(row: Mapping[str, Any]) -> list[dict[str, Any]]:
    title = _catalog_title(row)
    labor_price = _non_negative(row.get("labor_price_per_m2"))
    return [
        _base_row(
            section="work",
            kind="work",
            formula="flat_per_m2",
            title=title,
            unit="m2",
            price=labor_price,
            consumption_per_m2=1,
            public_category="works",
            public_title=title,
            sort_order=10,
        )
    ]


def _layout_synthetic_rows(row: Mapping[str, Any]) -> list[dict[str, Any]]:
    title = _catalog_title(row)
    labor_multiplier = _positive_or_one(row.get("labor_multiplier"))
    labor_price = _non_negative(row.get("labor_price_per_m2"))
    return [
        _base_row(
            section="work",
            kind="work",
            formula="flat_per_m2",
            title=title,
            unit="m2",
            price=labor_price,
            consumption_per_m2=labor_multiplier,
            public_category="works",
            public_title=title,
            sort_order=10,
        )
    ]


def _consumable_row_from_flat_fields(
    *,
    title: str,
    unit: str,
    consumption_per_m2: Any,
    price_per_unit: Any,
    sort_order: int,
) -> dict[str, Any] | None:
    consumption = _non_negative(consumption_per_m2)
    price = _non_negative(price_per_unit)
    total_per_m2 = round(consumption * price, 6)
    if total_per_m2 <= 0:
        return None

    if consumption > 0 and price > 0:
        package_defaults = _synthetic_consumable_package_defaults(title)
        if package_defaults is not None:
            formula, package_size = package_defaults
            return _base_row(
                section="consumable",
                kind="consumable",
                formula=formula,
                title=title,
                unit=unit,
                price=round(price * package_size, 6),
                consumption_per_m2=consumption,
                package_size=package_size,
                public_category="consumables",
                public_title=title,
                sort_order=sort_order,
            )

        return _base_row(
            section="consumable",
            kind="consumable",
            formula="unit_consumption",
            title=title,
            unit=unit,
            price=price,
            consumption_per_m2=consumption,
            public_category="consumables",
            public_title=title,
            sort_order=sort_order,
        )

    return _base_row(
        section="consumable",
        kind="consumable",
        formula="flat_per_m2",
        title=title,
        unit="m2",
        price=total_per_m2,
        consumption_per_m2=1,
        public_category="consumables",
        public_title=title,
        sort_order=sort_order,
    )


def _synthetic_consumable_package_defaults(title: str) -> tuple[str, float] | None:
    normalized = normalize_text(title)
    for key, value in _SYNTHETIC_CONSUMABLE_PACKAGE_DEFAULTS.items():
        if key in normalized:
            return value
    return None


def _base_row(
    *,
    section: str,
    kind: str,
    formula: str,
    title: str,
    unit: str,
    price: float,
    consumption_per_m2: float,
    public_category: str,
    public_title: str,
    sort_order: int,
    package_size: float | None = None,
) -> dict[str, Any]:
    return {
        "assembly_item_id": None,
        "section": section,
        "kind": kind,
        "formula": formula,
        "title": title,
        "unit": unit,
        "price": price,
        "consumption_per_m2": consumption_per_m2,
        "package_size": package_size,
        "layer_mm": None,
        "sort_order": sort_order,
        "is_enabled": True,
        "public_category": public_category,
        "public_title": public_title,
    }


def _catalog_title(row: Mapping[str, Any]) -> str:
    return _text(row.get("title")) or "Без названия"


def _text(value: Any) -> str:
    return str(value or "").strip()


def _non_negative(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, bool):
        return 0.0
    try:
        parsed = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed > 0 else 0.0


def _positive_or_one(value: Any) -> float:
    parsed = _non_negative(value)
    return parsed if parsed > 0 else 1.0


def _consumable_price_per_m2(consumption: Any, price_per_unit: Any) -> float:
    return round(_non_negative(consumption) * _non_negative(price_per_unit), 6)
