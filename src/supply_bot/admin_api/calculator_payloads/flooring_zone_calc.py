from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import parse_flooring_custom_consumables

ZONE_TOTAL_KEYS = (
    "effective_area_m2",
    "purchase_area_m2",
    "material_cost",
    "installation_cost",
    "preparation_work_cost",
    "preparation_material_cost",
    "preparation_total_cost",
    "underlay_qty",
    "underlay_cost",
    "glue_qty",
    "glue_cost",
    "primer_qty",
    "primer_cost",
    "svp_qty",
    "svp_cost",
    "grout_qty",
    "grout_cost",
    "custom_consumables_cost",
    "instrument_cost",
)

ROOM_COST_KEYS = (
    "material_cost",
    "installation_cost",
    "preparation_total_cost",
    "underlay_cost",
    "glue_cost",
    "primer_cost",
    "svp_cost",
    "grout_cost",
    "custom_consumables_cost",
    "instrument_cost",
)


def calculate_flooring_zone(
    *,
    config: dict[str, Any],
    covering: dict[str, Any] | None,
    preparation: dict[str, Any] | None,
    layout: dict[str, Any] | None,
    effective_area: float,
) -> dict[str, Any]:
    base_waste = float(covering["base_waste_percent"]) if covering else 0.0
    extra_waste = float(layout["extra_waste_percent"]) if layout else 0.0
    total_waste = base_waste + extra_waste
    purchase_area = effective_area * (1 + total_waste / 100.0)
    material_price = float(covering["material_price_per_m2"]) if covering else 0.0
    base_labor = float(covering["labor_price_per_m2"]) if covering else 0.0
    layout_multiplier = float(layout["labor_multiplier"]) if layout else 1.0
    labor_with_coef = base_labor * layout_multiplier
    prep_work = prep_material = prep_primer_qty = prep_primer_cost = 0.0
    if preparation and bool(config["include_preparation"]):
        prep_work = effective_area * float(preparation["labor_price_per_m2"] or 0.0)
        prep_material = effective_area * float(preparation["material_price_per_m2"] or 0.0)
        prep_primer_qty = effective_area * float(preparation["primer_consumption_per_m2"] or 0.0)
        prep_primer_cost = prep_primer_qty * float(preparation["primer_price_per_unit"] or 0.0)
    underlay_qty = underlay_cost = 0.0
    if covering and bool(config["include_underlay"]) and str(covering["underlay_mode"]) != "none":
        underlay_qty = effective_area * float(covering["underlay_consumption_per_m2"] or 1.0)
        underlay_cost = underlay_qty * float(config["underlay_price_per_m2"] or 0.0)
    material_cost = purchase_area * material_price
    installation_cost = effective_area * labor_with_coef
    glue_qty = purchase_area * float(covering["glue_consumption_per_m2"] or 0.0) if covering else 0.0
    glue_cost = glue_qty * float(covering["glue_price_per_unit"] or 0.0) if covering else 0.0
    covering_primer_qty = (
        purchase_area * float(covering["primer_consumption_per_m2"] or 0.0) if covering else 0.0
    )
    covering_primer_cost = (
        covering_primer_qty * float(covering["primer_price_per_unit"] or 0.0) if covering else 0.0
    )
    svp_qty = purchase_area * float(covering["svp_consumption_per_m2"] or 0.0) if covering else 0.0
    svp_cost = svp_qty * float(covering["svp_price_per_unit"] or 0.0) if covering else 0.0
    grout_qty = purchase_area * float(covering["grout_consumption_per_m2"] or 0.0) if covering else 0.0
    grout_cost = grout_qty * float(covering["grout_price_per_unit"] or 0.0) if covering else 0.0
    custom_consumables_cost = sum(
        purchase_area * item["consumption_per_m2"] * item["price_per_unit"]
        for item in parse_flooring_custom_consumables(covering)
    )
    instrument_cost = effective_area * float(covering["instrument_price_per_m2"] or 0.0) if covering else 0.0
    prep_total = prep_work + prep_material
    total_cost = (
        material_cost
        + installation_cost
        + prep_total
        + underlay_cost
        + glue_cost
        + prep_primer_cost
        + covering_primer_cost
        + svp_cost
        + grout_cost
        + custom_consumables_cost
        + instrument_cost
    )
    return {
        "effective_area_m2": effective_area,
        "purchase_area_m2": purchase_area,
        "material_cost": material_cost,
        "installation_cost": installation_cost,
        "preparation_work_cost": prep_work,
        "preparation_material_cost": prep_material,
        "preparation_total_cost": prep_total,
        "underlay_qty": underlay_qty,
        "underlay_cost": underlay_cost,
        "glue_qty": glue_qty,
        "glue_cost": glue_cost,
        "primer_qty": prep_primer_qty + covering_primer_qty,
        "primer_cost": prep_primer_cost + covering_primer_cost,
        "svp_qty": svp_qty,
        "svp_cost": svp_cost,
        "grout_qty": grout_qty,
        "grout_cost": grout_cost,
        "custom_consumables_cost": custom_consumables_cost,
        "instrument_cost": instrument_cost,
        "total_cost": total_cost,
    }
