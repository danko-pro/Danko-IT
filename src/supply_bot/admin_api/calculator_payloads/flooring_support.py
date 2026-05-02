from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import parse_flooring_custom_consumables

FlooringSpecMap = dict[tuple[str, str, str, str], dict[str, Any]]

def build_flooring_summary(config: dict[str, Any]) -> dict[str, Any]:
    return {
        "rooms_count": 0,
        "total_area_m2": 0.0,
        "total_perimeter_m": 0.0,
        "total_purchase_area_m2": 0.0,
        "total_material_cost": 0.0,
        "total_installation_cost": 0.0,
        "total_preparation_work_cost": 0.0,
        "total_preparation_material_cost": 0.0,
        "total_preparation_cost": 0.0,
        "total_underlay_qty": 0.0,
        "underlay_unit": "\u043c\u00b2",
        "total_underlay_cost": 0.0,
        "total_glue_qty": 0.0,
        "glue_unit": "\u043a\u0433",
        "total_glue_cost": 0.0,
        "total_primer_qty": 0.0,
        "primer_unit": "\u043b",
        "total_primer_cost": 0.0,
        "total_svp_qty": 0.0,
        "svp_unit": "\u0448\u0442",
        "total_svp_cost": 0.0,
        "total_grout_qty": 0.0,
        "grout_unit": "\u043a\u0433",
        "total_grout_cost": 0.0,
        "total_custom_consumables_cost": 0.0,
        "total_plinth_m": 0.0,
        "total_plinth_material_cost": 0.0,
        "total_plinth_install_cost": 0.0,
        "total_demolition_cost": 0.0,
        "threshold_profile_count": int(config["threshold_profile_count"]),
        "threshold_profile_cost": 0.0,
        "total_instrument_cost": 0.0,
        "global_work_cost": 0.0,
        "global_material_cost": 0.0,
        "work_total": 0.0,
        "material_total": 0.0,
        "grand_total": 0.0,
        "price_per_m2": None,
    }


def add_flooring_spec(
    spec_map: FlooringSpecMap,
    kind: str,
    title: str,
    unit: str,
    quantity: float,
    amount: float,
) -> None:
    if quantity <= 0 or amount <= 0:
        return
    key = (kind, title, unit, "")
    current = spec_map.setdefault(
        key,
        {"kind": kind, "title": title, "unit": unit, "quantity": 0.0, "amount": 0.0},
    )
    current["quantity"] += quantity
    current["amount"] += amount


def apply_flooring_room_selection(
    summary: dict[str, Any],
    spec_map: FlooringSpecMap,
    *,
    config: dict[str, Any],
    room: dict[str, Any],
    covering: dict[str, Any] | None,
    preparation: dict[str, Any] | None,
    layout: dict[str, Any] | None,
) -> None:
    summary["rooms_count"] += 1
    summary["total_area_m2"] += room["effective_area_m2"]
    summary["total_perimeter_m"] += room.get("effective_perimeter_m", 0.0)
    summary["total_purchase_area_m2"] += room["purchase_area_m2"]
    summary["total_material_cost"] += room["material_cost"]
    summary["total_installation_cost"] += room["installation_cost"]
    summary["total_preparation_work_cost"] += room["preparation_work_cost"]
    summary["total_preparation_material_cost"] += room["preparation_material_cost"]
    summary["total_preparation_cost"] += room["preparation_total_cost"]
    summary["total_underlay_qty"] += room["underlay_qty"]
    summary["total_underlay_cost"] += room["underlay_cost"]
    summary["total_glue_qty"] += room["glue_qty"]
    summary["total_glue_cost"] += room["glue_cost"]
    summary["total_primer_qty"] += room["primer_qty"]
    summary["total_primer_cost"] += room["primer_cost"]
    summary["total_svp_qty"] += room["svp_qty"]
    summary["total_svp_cost"] += room["svp_cost"]
    summary["total_grout_qty"] += room["grout_qty"]
    summary["total_grout_cost"] += room["grout_cost"]
    summary["total_custom_consumables_cost"] += room.get("custom_consumables_cost", 0.0)
    summary["total_plinth_m"] += room["plinth_m"]
    summary["total_plinth_material_cost"] += room["plinth_material_cost"]
    summary["total_plinth_install_cost"] += room["plinth_install_cost"]
    summary["total_demolition_cost"] += room["demolition_cost"]
    summary["total_instrument_cost"] += room["instrument_cost"]
    if covering:
        summary["glue_unit"] = str(covering["glue_unit"] or summary["glue_unit"])
        summary["svp_unit"] = str(covering["svp_unit"] or summary["svp_unit"])
        summary["grout_unit"] = str(covering["grout_unit"] or summary["grout_unit"])
    summary["primer_unit"] = str(
        preparation["primer_unit"]
        if preparation and preparation.get("primer_unit")
        else (covering["primer_unit"] if covering else summary["primer_unit"])
    )

    layout_title = str(layout["title"]) if layout else "\u041f\u0440\u044f\u043c\u0430\u044f"
    covering_title = str(covering["title"]) if covering else "\u041f\u043e\u043a\u0440\u044b\u0442\u0438\u0435"
    add_flooring_spec(
        spec_map,
        "work",
        f"\u0423\u043a\u043b\u0430\u0434\u043a\u0430 {covering_title}, {layout_title.lower()}",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["installation_cost"],
    )
    add_flooring_spec(
        spec_map, "material", covering_title, "\u043c\u00b2", room["purchase_area_m2"], room["material_cost"]
    )
    if preparation and bool(config["include_preparation"]):
        prep_title = str(preparation["title"])
        add_flooring_spec(
            spec_map,
            "work",
            f"Подготовка основания: {prep_title}",
            "\u043c\u00b2",
            room["effective_area_m2"],
            room["preparation_work_cost"],
        )
        add_flooring_spec(
            spec_map,
            "material",
            f"Материалы подготовки: {prep_title}",
            "\u043c\u00b2",
            room["effective_area_m2"],
            room["preparation_material_cost"],
        )
    add_flooring_spec(
        spec_map,
        "material",
        "\u041f\u043e\u0434\u043b\u043e\u0436\u043a\u0430",
        "\u043c\u00b2",
        room["underlay_qty"],
        room["underlay_cost"],
    )
    add_flooring_spec(
        spec_map, "material", "\u041a\u043b\u0435\u0439", summary["glue_unit"], room["glue_qty"], room["glue_cost"]
    )
    add_flooring_spec(
        spec_map,
        "material",
        "\u0413\u0440\u0443\u043d\u0442\u043e\u0432\u043a\u0430",
        summary["primer_unit"],
        room["primer_qty"],
        room["primer_cost"],
    )
    add_flooring_spec(
        spec_map, "material", "\u0421\u0412\u041f", summary["svp_unit"], room["svp_qty"], room["svp_cost"]
    )
    add_flooring_spec(
        spec_map,
        "material",
        "\u0417\u0430\u0442\u0438\u0440\u043a\u0430",
        summary["grout_unit"],
        room["grout_qty"],
        room["grout_cost"],
    )
    for item in parse_flooring_custom_consumables(covering):
        qty = room["purchase_area_m2"] * item["consumption_per_m2"]
        add_flooring_spec(spec_map, "material", item["title"], item["unit"], qty, qty * item["price_per_unit"])
    add_flooring_spec(
        spec_map,
        "material",
        "\u041f\u043b\u0438\u043d\u0442\u0443\u0441",
        "\u043c.\u043f.",
        room["plinth_m"],
        room["plinth_material_cost"],
    )
    add_flooring_spec(
        spec_map,
        "work",
        "\u041c\u043e\u043d\u0442\u0430\u0436 \u043f\u043b\u0438\u043d\u0442\u0443\u0441\u0430",
        "\u043c.\u043f.",
        room["plinth_m"],
        room["plinth_install_cost"],
    )
    add_flooring_spec(
        spec_map,
        "work",
        "Демонтаж напольного покрытия",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["demolition_cost"],
    )
    add_flooring_spec(
        spec_map,
        "material",
        "\u0420\u0430\u0441\u0445\u043e\u0434 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["instrument_cost"],
    )


def finalize_flooring_summary(
    summary: dict[str, Any],
    spec_map: FlooringSpecMap,
    config: dict[str, Any],
) -> None:
    from supply_bot.admin_api.calculator_payloads.flooring_global_items import apply_flooring_global_items

    if summary["rooms_count"] > 0 and summary["threshold_profile_count"] > 0:
        summary["threshold_profile_cost"] = summary["threshold_profile_count"] * float(
            config["threshold_profile_price"] or 0.0
        )
        add_flooring_spec(
            spec_map,
            "material",
            "Порожек / стыковочный профиль",
            "\u0448\u0442",
            summary["threshold_profile_count"],
            summary["threshold_profile_cost"],
        )

    apply_flooring_global_items(summary, spec_map, config)
    summary["work_total"] = (
        summary["total_installation_cost"]
        + summary["total_preparation_work_cost"]
        + summary["total_plinth_install_cost"]
        + summary["total_demolition_cost"]
        + summary["global_work_cost"]
    )
    summary["material_total"] = (
        summary["total_material_cost"]
        + summary["total_preparation_material_cost"]
        + summary["total_underlay_cost"]
        + summary["total_glue_cost"]
        + summary["total_primer_cost"]
        + summary["total_svp_cost"]
        + summary["total_grout_cost"]
        + summary["total_custom_consumables_cost"]
        + summary["total_plinth_material_cost"]
        + summary["threshold_profile_cost"]
        + summary["total_instrument_cost"]
        + summary["global_material_cost"]
    )
    summary["grand_total"] = summary["work_total"] + summary["material_total"]
    if summary["total_area_m2"] > 0:
        summary["price_per_m2"] = summary["grand_total"] / summary["total_area_m2"]
