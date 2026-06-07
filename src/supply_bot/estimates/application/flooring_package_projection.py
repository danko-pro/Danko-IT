from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from supply_bot.application.errors import ValidationError
from supply_bot.estimates.application.flooring_assembly_catalog import FLOORING_ASSEMBLY_FORMULAS
from supply_bot.estimates.application.flooring_catalog_assembly import (
    FLOORING_CATALOG_ASSEMBLY_PUBLIC_CATEGORIES,
    PUBLIC_CATEGORY_BY_KIND,
    validate_flooring_catalog_assembly_target_kind,
)
from supply_bot.utils import normalize_text, slugify

FLOORING_PACKAGE_SPEC_BASIS = "area"

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

_TARGET_ALLOWED_KINDS: dict[str, frozenset[str]] = {
    "covering": frozenset({"material", "consumable", "tool"}),
    "preparation": frozenset({"work"}),
    "layout": frozenset({"work"}),
}


def calculate_flooring_assembly_row_total(row: Mapping[str, Any]) -> float:
    """Return the flat per-m2 value represented by one assembly row."""

    formula = _normalize_formula(row.get("formula"))
    kind = _normalize_kind(row.get("kind"))
    price = _number(row.get("price"))
    consumption = _number(row.get("consumption_per_m2"))
    package_size = _number(row.get("package_size"))
    layer_mm = _number(row.get("layer_mm"))

    if formula == "flat_per_m2":
        return price * _flat_per_m2_coefficient(kind, consumption)
    if formula == "unit_consumption":
        return price * consumption
    if formula == "package_consumption":
        return (price / package_size) * consumption if package_size > 0 else price * consumption
    if formula == "layer_consumption":
        if package_size > 0 and layer_mm > 0:
            return (price / package_size) * consumption * layer_mm
        return price * consumption
    if formula == "piece_consumption":
        return (price / package_size) * consumption if package_size > 0 else price * consumption
    if formula == "kg_layer_consumption":
        return (price / package_size) * consumption * max(1.0, layer_mm) if package_size > 0 else price * consumption
    if formula == "liquid_layers":
        return (price / package_size) * consumption * max(1.0, layer_mm) if package_size > 0 else price * consumption
    if formula == "roll_meter_consumption":
        return (price / package_size) * consumption if package_size > 0 else price * consumption
    if formula == "sheet_area_consumption":
        return (price / package_size) * consumption if package_size > 0 else price * consumption
    if formula == "fixed_area_allocation":
        return price / package_size if package_size > 0 else price
    raise ValidationError("Invalid flooring assembly formula")


def build_flooring_package_projection(target_kind: str, rows: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Project saved package assembly rows into flat public rates and safe spec lines.

    This is intentionally pure: no DB calls, no snapshot writes, no public UI side effects.
    """

    normalized_target = validate_flooring_catalog_assembly_target_kind(target_kind)
    enabled_rows = [row for row in rows if _is_enabled(row)]
    _validate_rows_for_target(normalized_target, enabled_rows)

    flat = _empty_flat_projection(normalized_target)
    totals = {
        "worksPerM2": 0.0,
        "materialsPerM2": 0.0,
        "consumablesPerM2": 0.0,
        "toolsPerM2": 0.0,
    }
    spec_lines: list[dict[str, Any]] = []

    for index, row in enumerate(enabled_rows, start=1):
        kind = _normalize_kind(row.get("kind"))
        total = calculate_flooring_assembly_row_total(row)
        category = _public_category(row, kind)

        if kind == "work":
            totals["worksPerM2"] += total
            flat["laborPricePerM2"] = _round_money(float(flat.get("laborPricePerM2", 0)) + total)
        elif kind == "material":
            totals["materialsPerM2"] += total
            flat["materialPricePerM2"] = _round_money(float(flat.get("materialPricePerM2", 0)) + total)
        elif kind == "tool":
            totals["toolsPerM2"] += total
            flat["toolConsumablesPerM2"] = _round_money(float(flat.get("toolConsumablesPerM2", 0)) + total)
        else:
            totals["consumablesPerM2"] += total
            bucket = _classify_consumable(row)
            if bucket == "adhesive":
                flat["adhesivePricePerM2"] = _round_money(float(flat["adhesivePricePerM2"]) + total)
            elif bucket == "primer":
                flat["primerPricePerM2"] = _round_money(float(flat["primerPricePerM2"]) + total)
            elif bucket == "svp":
                flat["svpPricePerM2"] = _round_money(float(flat["svpPricePerM2"]) + total)
            elif bucket == "grout":
                flat["groutPricePerM2"] = _round_money(float(flat["groutPricePerM2"]) + total)
            else:
                flat["toolConsumablesPerM2"] = _round_money(float(flat.get("toolConsumablesPerM2", 0)) + total)

        spec_lines.append(_build_spec_line(row, target_kind=normalized_target, category=category, index=index))

    return {
        "targetKind": normalized_target,
        "flat": flat,
        "totals": {key: _round_money(value) for key, value in totals.items()},
        "specLines": spec_lines,
    }


def _empty_flat_projection(target_kind: str) -> dict[str, Any]:
    if target_kind == "covering":
        return {
            "materialPricePerM2": 0.0,
            "laborPricePerM2": 0.0,
            "adhesivePricePerM2": 0.0,
            "primerPricePerM2": 0.0,
            "svpPricePerM2": 0.0,
            "groutPricePerM2": 0.0,
            "toolConsumablesPerM2": 0.0,
        }
    if target_kind == "preparation":
        return {
            "laborPricePerM2": 0.0,
            "materialPricePerM2": 0.0,
        }
    return {
        "laborPricePerM2": 0.0,
    }


def _build_spec_line(row: Mapping[str, Any], *, target_kind: str, category: str, index: int) -> dict[str, Any]:
    unit_price, quantity_per_basis = _spec_unit_price_and_quantity(row)
    title = _public_title(row)
    code = slugify(f"{target_kind}-{category}-{title}-{index}", prefix="flooring-line")
    line: dict[str, Any] = {
        "code": code,
        "title": title,
        "category": category,
        "basis": FLOORING_PACKAGE_SPEC_BASIS,
        "unit": _text(row.get("unit")) or "pcs",
        "quantityPerBasis": _round_quantity(quantity_per_basis),
        "unitPrice": _round_money(unit_price),
        "aggregationKey": code,
    }
    package_size = _number(row.get("package_size"))
    if package_size > 0:
        line["packageSize"] = _round_quantity(package_size)
        line["packageUnit"] = line["unit"]

    if _purchase_mode(row) == "package":
        line["purchaseMode"] = "package"
        line["packagePrice"] = _round_money(_number(row.get("price")))
        line["purchaseAggregation"] = _purchase_aggregation(row)

    calculation_note = _calculation_note(row)
    if calculation_note:
        line["calculationNote"] = calculation_note

    return line


def _purchase_mode(row: Mapping[str, Any]) -> str:
    package_size = _number(row.get("package_size"))
    if package_size <= 0:
        return "raw"
    formula = _normalize_formula(row.get("formula"))
    if formula in _PACKAGE_AWARE_FORMULAS:
        return "package"
    return "raw"


def _purchase_aggregation(row: Mapping[str, Any]) -> str:
    kind = _normalize_kind(row.get("kind"))
    if kind == "work":
        return "room"
    return "project"


def _calculation_note(row: Mapping[str, Any]) -> str:
    formula = _normalize_formula(row.get("formula"))
    unit = _text(row.get("unit")) or "pcs"
    consumption = _number(row.get("consumption_per_m2"))
    layer_mm = _number(row.get("layer_mm"))
    consumption_text = _format_public_quantity(consumption)

    if formula == "kg_layer_consumption" and consumption > 0:
        layer_part = _format_public_quantity(layer_mm if layer_mm > 0 else 1.0)
        return f"{consumption_text} {unit}/m²/mm × {layer_part} mm"
    if formula == "liquid_layers" and consumption > 0:
        layer_part = _format_public_quantity(layer_mm if layer_mm > 0 else 1.0)
        return f"{consumption_text} {unit}/m² × {layer_part} mm"
    if formula == "layer_consumption" and consumption > 0 and layer_mm > 0:
        return f"{consumption_text} {unit}/m² × {_format_public_quantity(layer_mm)} mm"
    if formula in {"package_consumption", "unit_consumption", "roll_meter_consumption"} and consumption > 0:
        return f"{consumption_text} {unit}/m²"
    if formula == "piece_consumption" and consumption > 0:
        return f"{consumption_text} {unit}/m²"
    if formula == "sheet_area_consumption" and consumption > 0:
        return f"{consumption_text} m²/m²"
    if formula == "flat_per_m2":
        coefficient = _flat_per_m2_coefficient(_normalize_kind(row.get("kind")), consumption)
        if coefficient != 1.0:
            return f"{_format_public_quantity(coefficient)} m²/m²"
    return ""


def _format_public_quantity(value: float) -> str:
    rounded = _round_quantity(value)
    if rounded == int(rounded):
        return str(int(rounded))
    text = f"{rounded:.6f}".rstrip("0").rstrip(".")
    return text or "0"


def _spec_unit_price_and_quantity(row: Mapping[str, Any]) -> tuple[float, float]:
    formula = _normalize_formula(row.get("formula"))
    kind = _normalize_kind(row.get("kind"))
    price = _number(row.get("price"))
    consumption = _number(row.get("consumption_per_m2"))
    package_size = _number(row.get("package_size"))
    layer_mm = _number(row.get("layer_mm"))

    if formula == "flat_per_m2":
        return price, _flat_per_m2_coefficient(kind, consumption)
    if formula == "unit_consumption":
        return price, consumption
    if formula == "package_consumption":
        return (price / package_size, consumption) if package_size > 0 else (price, consumption)
    if formula == "layer_consumption":
        if package_size > 0 and layer_mm > 0:
            return price / package_size, consumption * layer_mm
        return price, consumption
    if formula == "piece_consumption":
        return (price / package_size, consumption) if package_size > 0 else (price, consumption)
    if formula == "kg_layer_consumption":
        return (price / package_size, consumption * max(1.0, layer_mm)) if package_size > 0 else (price, consumption)
    if formula == "liquid_layers":
        return (price / package_size, consumption * max(1.0, layer_mm)) if package_size > 0 else (price, consumption)
    if formula == "roll_meter_consumption":
        return (price / package_size, consumption) if package_size > 0 else (price, consumption)
    if formula == "sheet_area_consumption":
        return (price / package_size, consumption) if package_size > 0 else (price, consumption)
    if formula == "fixed_area_allocation":
        return (price / package_size, 1.0) if package_size > 0 else (price, 1.0)
    raise ValidationError("Invalid flooring assembly formula")


def _validate_rows_for_target(target_kind: str, rows: Sequence[Mapping[str, Any]]) -> None:
    allowed_kinds = _TARGET_ALLOWED_KINDS[target_kind]
    for row in rows:
        kind = _normalize_kind(row.get("kind"))
        if kind not in allowed_kinds:
            raise ValidationError(f"Invalid flooring package row kind for {target_kind}")
        _normalize_formula(row.get("formula"))
        _public_category(row, kind)
        _validate_public_unit(row)
        if target_kind == "layout" and kind == "work" and _number(row.get("price")) <= 0:
            raise ValidationError("Floor layout assembly work rows require price > 0")
        if not _public_title(row):
            raise ValidationError("Flooring package row title is required")


def _validate_public_unit(row: Mapping[str, Any]) -> None:
    unit = _text(row.get("unit"))
    if not unit:
        raise ValidationError("Flooring package row unit is required")
    if _is_numeric_unit(unit):
        raise ValidationError("Flooring package row unit must be a measurement unit")


def _is_numeric_unit(unit: str) -> bool:
    normalized = unit.strip().replace(",", ".")
    if not normalized:
        return False
    try:
        float(normalized)
    except ValueError:
        return False
    return True


def _flat_per_m2_coefficient(kind: str, consumption: float) -> float:
    if kind not in {"material", "work"}:
        return 1.0
    return consumption if consumption > 0 else 1.0


def _classify_consumable(row: Mapping[str, Any]) -> str:
    normalized = normalize_text(_public_title(row))
    if "клей" in normalized or "адгез" in normalized or "glue" in normalized:
        return "adhesive"
    if "грунт" in normalized or "primer" in normalized:
        return "primer"
    if "свп" in normalized or "крест" in normalized or "spacer" in normalized:
        return "svp"
    if "затир" in normalized or "grout" in normalized:
        return "grout"
    return "other"


def _public_category(row: Mapping[str, Any], kind: str) -> str:
    category = _text(row.get("public_category")) or PUBLIC_CATEGORY_BY_KIND[kind]
    if category not in FLOORING_CATALOG_ASSEMBLY_PUBLIC_CATEGORIES:
        raise ValidationError("Invalid flooring package public category")
    expected = PUBLIC_CATEGORY_BY_KIND[kind]
    if category != expected:
        raise ValidationError("Flooring package public category must match row kind")
    return category


def _public_title(row: Mapping[str, Any]) -> str:
    return _text(row.get("public_title")) or _text(row.get("title"))


def _normalize_kind(value: Any) -> str:
    kind = _text(value)
    if kind not in PUBLIC_CATEGORY_BY_KIND:
        raise ValidationError("Invalid flooring package row kind")
    return kind


def _normalize_formula(value: Any) -> str:
    formula = _text(value)
    if formula not in FLOORING_ASSEMBLY_FORMULAS:
        raise ValidationError("Invalid flooring package row formula")
    return formula


def _is_enabled(row: Mapping[str, Any]) -> bool:
    value = row.get("is_enabled", True)
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() not in {"0", "false", "no", "off"}
    return bool(value)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _number(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    if isinstance(value, bool):
        return 0.0
    try:
        parsed = float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed > 0 else 0.0


def _round_money(value: float) -> float:
    return round(value + 0.0, 6)


def _round_quantity(value: float) -> float:
    return round(value + 0.0, 6)


def has_enabled_flooring_assembly_rows(rows: Sequence[Mapping[str, Any]]) -> bool:
    return any(_is_enabled(row) for row in rows)


def layout_labor_multiplier_from_assembly_rows(rows: Sequence[Mapping[str, Any]]) -> float:
    """Match catalog-editor layoutLaborFactorFromAssemblyRows (work row consumption)."""

    enabled_work = [row for row in rows if _is_enabled(row) and _normalize_kind(row.get("kind")) == "work"]
    coefficient = 0.0
    for row in enabled_work:
        consumption = _number(row.get("consumption_per_m2"))
        if consumption > 0:
            coefficient = consumption
            break
    return coefficient if coefficient > 0 else 1.0


def _flat_consumable_db_fields(price_per_m2: float) -> tuple[float, float]:
    if price_per_m2 > 0:
        return 1.0, price_per_m2
    return 0.0, 0.0


def catalog_update_values_from_projection(
    target_kind: str,
    projection: Mapping[str, Any],
    *,
    assembly_rows: Sequence[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    """Map projection flat rates to CRM catalog columns (parity with applyAggregatesToCoveringDraft)."""

    normalized_target = validate_flooring_catalog_assembly_target_kind(target_kind)
    flat = dict(projection.get("flat") or {})

    if normalized_target == "covering":
        glue_con, glue_price = _flat_consumable_db_fields(_number(flat.get("adhesivePricePerM2")))
        primer_con, primer_price = _flat_consumable_db_fields(_number(flat.get("primerPricePerM2")))
        svp_con, svp_price = _flat_consumable_db_fields(_number(flat.get("svpPricePerM2")))
        grout_con, grout_price = _flat_consumable_db_fields(_number(flat.get("groutPricePerM2")))
        return {
            "material_price_per_m2": _number(flat.get("materialPricePerM2")),
            "labor_price_per_m2": 0.0,
            "instrument_price_per_m2": _number(flat.get("toolConsumablesPerM2")),
            "glue_consumption_per_m2": glue_con,
            "glue_price_per_unit": glue_price,
            "primer_consumption_per_m2": primer_con,
            "primer_price_per_unit": primer_price,
            "svp_consumption_per_m2": svp_con,
            "svp_price_per_unit": svp_price,
            "grout_consumption_per_m2": grout_con,
            "grout_price_per_unit": grout_price,
        }

    if normalized_target == "preparation":
        return {
            "labor_price_per_m2": _number(flat.get("laborPricePerM2")),
            "material_price_per_m2": _number(flat.get("materialPricePerM2")),
        }

    rows = assembly_rows or ()
    return {
        "labor_price_per_m2": _number(flat.get("laborPricePerM2")),
        "labor_multiplier": layout_labor_multiplier_from_assembly_rows(rows),
    }
