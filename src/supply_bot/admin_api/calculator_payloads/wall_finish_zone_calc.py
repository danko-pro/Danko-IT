from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.wall_finish_custom_consumables import (
    parse_wall_finish_custom_consumables,
)

ZONE_TOTAL_KEYS = (
    "effective_area_m2",
    "purchase_area_m2",
    "material_cost",
    "installation_cost",
    "preparation_work_cost",
    "preparation_material_cost",
    "preparation_total_cost",
    "glue_qty",
    "glue_cost",
    "primer_qty",
    "primer_cost",
    "putty_qty",
    "putty_cost",
    "mesh_qty",
    "mesh_cost",
    "custom_consumables_cost",
    "instrument_cost",
)

ROOM_COST_KEYS = (
    "material_cost",
    "installation_cost",
    "preparation_total_cost",
    "glue_cost",
    "primer_cost",
    "putty_cost",
    "mesh_cost",
    "custom_consumables_cost",
    "instrument_cost",
)


def calculate_wall_finish_zone(
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

    preparation_work_cost = 0.0
    preparation_material_cost = 0.0
    preparation_primer_qty = 0.0
    preparation_primer_cost = 0.0
    if preparation and bool(config["include_preparation"]):
        preparation_work_cost = effective_area * float(preparation["labor_price_per_m2"] or 0.0)
        preparation_material_cost = effective_area * float(preparation["material_price_per_m2"] or 0.0)
        preparation_primer_qty = effective_area * float(preparation["primer_consumption_per_m2"] or 0.0)
        preparation_primer_cost = preparation_primer_qty * float(preparation["primer_price_per_unit"] or 0.0)
    preparation_total_cost = preparation_work_cost + preparation_material_cost

    material_cost = purchase_area * material_price
    installation_cost = effective_area * labor_with_coef
    glue_qty = purchase_area * float(covering["glue_consumption_per_m2"] or 0.0) if covering else 0.0
    glue_cost = glue_qty * float(covering["glue_price_per_unit"] or 0.0) if covering else 0.0
    covering_primer_qty = purchase_area * float(covering["primer_consumption_per_m2"] or 0.0) if covering else 0.0
    covering_primer_cost = covering_primer_qty * float(covering["primer_price_per_unit"] or 0.0) if covering else 0.0
    primer_qty = preparation_primer_qty + covering_primer_qty
    primer_cost = preparation_primer_cost + covering_primer_cost
    putty_qty = purchase_area * float(covering["putty_consumption_per_m2"] or 0.0) if covering else 0.0
    putty_cost = putty_qty * float(covering["putty_price_per_unit"] or 0.0) if covering else 0.0
    mesh_qty = purchase_area * float(covering["mesh_consumption_per_m2"] or 0.0) if covering else 0.0
    mesh_cost = mesh_qty * float(covering["mesh_price_per_unit"] or 0.0) if covering else 0.0
    custom_consumables_cost = sum(
        purchase_area * item["consumption_per_m2"] * item["price_per_unit"]
        for item in parse_wall_finish_custom_consumables(covering)
    )
    instrument_cost = effective_area * float(covering["instrument_price_per_m2"] or 0.0) if covering else 0.0
    total_cost = (
        material_cost
        + installation_cost
        + preparation_total_cost
        + glue_cost
        + primer_cost
        + putty_cost
        + mesh_cost
        + custom_consumables_cost
        + instrument_cost
    )
    return {
        "effective_area_m2": effective_area,
        "purchase_area_m2": purchase_area,
        "material_cost": material_cost,
        "installation_cost": installation_cost,
        "preparation_work_cost": preparation_work_cost,
        "preparation_material_cost": preparation_material_cost,
        "preparation_total_cost": preparation_total_cost,
        "glue_qty": glue_qty,
        "glue_cost": glue_cost,
        "primer_qty": primer_qty,
        "primer_cost": primer_cost,
        "putty_qty": putty_qty,
        "putty_cost": putty_cost,
        "mesh_qty": mesh_qty,
        "mesh_cost": mesh_cost,
        "custom_consumables_cost": custom_consumables_cost,
        "instrument_cost": instrument_cost,
        "total_cost": total_cost,
    }
