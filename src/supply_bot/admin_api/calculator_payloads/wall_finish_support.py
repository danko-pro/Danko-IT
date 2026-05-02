from __future__ import annotations

from typing import Any

WallFinishSpecMap = dict[tuple[str, str, str], dict[str, Any]]


def build_wall_finish_summary() -> dict[str, Any]:
    return {
        "rooms_count": 0,
        "total_area_m2": 0.0,
        "total_purchase_area_m2": 0.0,
        "total_material_cost": 0.0,
        "total_installation_cost": 0.0,
        "total_preparation_work_cost": 0.0,
        "total_preparation_material_cost": 0.0,
        "total_preparation_cost": 0.0,
        "total_glue_qty": 0.0,
        "glue_unit": "\u043a\u0433",
        "total_glue_cost": 0.0,
        "total_primer_qty": 0.0,
        "primer_unit": "\u043b",
        "total_primer_cost": 0.0,
        "total_putty_qty": 0.0,
        "putty_unit": "\u043a\u0433",
        "total_putty_cost": 0.0,
        "total_mesh_qty": 0.0,
        "mesh_unit": "\u043c\u00b2",
        "total_mesh_cost": 0.0,
        "total_demolition_cost": 0.0,
        "total_instrument_cost": 0.0,
        "work_total": 0.0,
        "material_total": 0.0,
        "grand_total": 0.0,
        "price_per_m2": None,
    }


def add_wall_finish_spec(
    spec_map: WallFinishSpecMap,
    kind: str,
    title: str,
    unit: str,
    quantity: float,
    amount: float,
) -> None:
    if quantity <= 0 or amount <= 0:
        return
    key = (kind, title, unit)
    if key not in spec_map:
        spec_map[key] = {
            "kind": kind,
            "title": title,
            "unit": unit,
            "quantity": 0.0,
            "amount": 0.0,
        }
    spec_map[key]["quantity"] += quantity
    spec_map[key]["amount"] += amount


def apply_wall_finish_room_selection(
    summary: dict[str, Any],
    spec_map: WallFinishSpecMap,
    *,
    config: dict[str, Any],
    room: dict[str, Any],
    covering: dict[str, Any] | None,
    preparation: dict[str, Any] | None,
    layout: dict[str, Any] | None,
) -> None:
    summary["rooms_count"] += 1
    summary["total_area_m2"] += room["effective_area_m2"]
    summary["total_purchase_area_m2"] += room["purchase_area_m2"]
    summary["total_material_cost"] += room["material_cost"]
    summary["total_installation_cost"] += room["installation_cost"]
    summary["total_preparation_work_cost"] += room["preparation_work_cost"]
    summary["total_preparation_material_cost"] += room["preparation_material_cost"]
    summary["total_preparation_cost"] += room["preparation_total_cost"]
    summary["total_glue_qty"] += room["glue_qty"]
    summary["total_glue_cost"] += room["glue_cost"]
    summary["total_primer_qty"] += room["primer_qty"]
    summary["total_primer_cost"] += room["primer_cost"]
    summary["total_putty_qty"] += room["putty_qty"]
    summary["total_putty_cost"] += room["putty_cost"]
    summary["total_mesh_qty"] += room["mesh_qty"]
    summary["total_mesh_cost"] += room["mesh_cost"]
    summary["total_demolition_cost"] += room["demolition_cost"]
    summary["total_instrument_cost"] += room["instrument_cost"]
    if covering and covering.get("glue_unit"):
        summary["glue_unit"] = str(covering["glue_unit"])
    if preparation and preparation.get("primer_unit"):
        summary["primer_unit"] = str(preparation["primer_unit"])
    elif covering and covering.get("primer_unit"):
        summary["primer_unit"] = str(covering["primer_unit"])
    if covering and covering.get("putty_unit"):
        summary["putty_unit"] = str(covering["putty_unit"])
    if covering and covering.get("mesh_unit"):
        summary["mesh_unit"] = str(covering["mesh_unit"])

    layout_title = str(layout["title"]) if layout else "\u0411\u0430\u0437\u043e\u0432\u0430\u044f"
    covering_title = str(covering["title"]) if covering else "Отделка стен"
    add_wall_finish_spec(
        spec_map,
        "work",
        f"Отделка стен: {covering_title}, {layout_title.lower()}",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["installation_cost"],
    )
    add_wall_finish_spec(
        spec_map,
        "material",
        covering_title,
        "\u043c\u00b2",
        room["purchase_area_m2"],
        room["material_cost"],
    )
    if preparation and bool(config["include_preparation"]):
        prep_title = str(preparation["title"])
        add_wall_finish_spec(
            spec_map,
            "work",
            f"Подготовка стен: {prep_title}",
            "\u043c\u00b2",
            room["effective_area_m2"],
            room["preparation_work_cost"],
        )
        add_wall_finish_spec(
            spec_map,
            "material",
            f"Материалы подготовки стен: {prep_title}",
            "\u043c\u00b2",
            room["effective_area_m2"],
            room["preparation_material_cost"],
        )
    add_wall_finish_spec(
        spec_map, "material", "\u041a\u043b\u0435\u0439", summary["glue_unit"], room["glue_qty"], room["glue_cost"]
    )
    add_wall_finish_spec(
        spec_map,
        "material",
        "\u0413\u0440\u0443\u043d\u0442\u043e\u0432\u043a\u0430",
        summary["primer_unit"],
        room["primer_qty"],
        room["primer_cost"],
    )
    add_wall_finish_spec(
        spec_map,
        "material",
        "\u0428\u043f\u0430\u043a\u043b\u0451\u0432\u043a\u0430",
        summary["putty_unit"],
        room["putty_qty"],
        room["putty_cost"],
    )
    add_wall_finish_spec(
        spec_map,
        "material",
        "\u0421\u0442\u0435\u043a\u043b\u043e\u0445\u043e\u043b\u0441\u0442 / \u0441\u0435\u0442\u043a\u0430",
        summary["mesh_unit"],
        room["mesh_qty"],
        room["mesh_cost"],
    )
    add_wall_finish_spec(
        spec_map,
        "work",
        "Демонтаж старой отделки стен",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["demolition_cost"],
    )
    add_wall_finish_spec(
        spec_map,
        "material",
        "\u0420\u0430\u0441\u0445\u043e\u0434 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u0430",
        "\u043c\u00b2",
        room["effective_area_m2"],
        room["instrument_cost"],
    )


def finalize_wall_finish_summary(summary: dict[str, Any]) -> None:
    summary["work_total"] = (
        summary["total_installation_cost"] + summary["total_preparation_work_cost"] + summary["total_demolition_cost"]
    )
    summary["material_total"] = (
        summary["total_material_cost"]
        + summary["total_preparation_material_cost"]
        + summary["total_glue_cost"]
        + summary["total_primer_cost"]
        + summary["total_putty_cost"]
        + summary["total_mesh_cost"]
        + summary["total_instrument_cost"]
    )
    summary["grand_total"] = summary["work_total"] + summary["material_total"]
    if summary["total_area_m2"] > 0:
        summary["price_per_m2"] = summary["grand_total"] / summary["total_area_m2"]
