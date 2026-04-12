from __future__ import annotations

from typing import Any

from supply_bot.storage import BotStorage


async def _estimate_wall_finish_payload(
    storage: BotStorage,
    project: dict[str, Any],
    rooms: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_wall_finish_config(project_id)
    coverings = await storage.list_estimate_wall_finish_coverings()
    preparations = await storage.list_estimate_wall_finish_preparations()
    layouts = await storage.list_estimate_wall_finish_layouts()
    selected_rows = await storage.list_estimate_wall_finish_rooms(project_id)

    selected_by_room = {int(row["room_id"]): row for row in selected_rows}
    coverings_by_id = {int(item["id"]): item for item in coverings}
    preparations_by_id = {int(item["id"]): item for item in preparations}
    layouts_by_id = {int(item["id"]): item for item in layouts}

    summary = {
        "rooms_count": 0,
        "total_area_m2": 0.0,
        "total_purchase_area_m2": 0.0,
        "total_material_cost": 0.0,
        "total_installation_cost": 0.0,
        "total_preparation_work_cost": 0.0,
        "total_preparation_material_cost": 0.0,
        "total_preparation_cost": 0.0,
        "total_glue_qty": 0.0,
        "glue_unit": "кг",
        "total_glue_cost": 0.0,
        "total_primer_qty": 0.0,
        "primer_unit": "л",
        "total_primer_cost": 0.0,
        "total_putty_qty": 0.0,
        "putty_unit": "кг",
        "total_putty_cost": 0.0,
        "total_mesh_qty": 0.0,
        "mesh_unit": "м²",
        "total_mesh_cost": 0.0,
        "total_demolition_cost": 0.0,
        "total_instrument_cost": 0.0,
        "work_total": 0.0,
        "material_total": 0.0,
        "grand_total": 0.0,
        "price_per_m2": None,
    }
    spec_map: dict[tuple[str, str, str], dict[str, Any]] = {}
    rooms_payload: list[dict[str, Any]] = []

    def add_spec(kind: str, title: str, unit: str, quantity: float, amount: float) -> None:
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

    for room in rooms:
        room_id = int(room["id"])
        selected_row = selected_by_room.get(room_id)
        selected = selected_row is not None
        covering = (
            coverings_by_id.get(int(selected_row["covering_id"]))
            if selected and selected_row.get("covering_id")
            else None
        )
        preparation = (
            preparations_by_id.get(int(selected_row["preparation_id"]))
            if selected and selected_row.get("preparation_id")
            else None
        )
        layout = (
            layouts_by_id.get(int(selected_row["layout_id"])) if selected and selected_row.get("layout_id") else None
        )

        base_area = float(room["wall_area_net_m2"] or 0.0)
        effective_area = (
            max(
                0.0,
                float(selected_row["area_m2_override"])
                if selected and selected_row.get("area_m2_override") is not None
                else base_area,
            )
            if selected
            else 0.0
        )

        base_waste = float(covering["base_waste_percent"] or 0.0) if covering else 0.0
        extra_waste = float(layout["extra_waste_percent"] or 0.0) if layout else 0.0
        total_waste = base_waste + extra_waste
        purchase_area = effective_area * (1 + total_waste / 100.0) if selected else 0.0

        material_price = float(covering["material_price_per_m2"] or 0.0) if covering else 0.0
        base_labor = float(covering["labor_price_per_m2"] or 0.0) if covering else 0.0
        layout_multiplier = float(layout["labor_multiplier"] or 1.0) if layout else 1.0
        labor_with_coef = base_labor * layout_multiplier if selected else 0.0

        material_cost = purchase_area * material_price
        installation_cost = effective_area * labor_with_coef

        preparation_work_cost = 0.0
        preparation_material_cost = 0.0
        preparation_primer_qty = 0.0
        preparation_primer_cost = 0.0
        if selected and preparation and bool(config["include_preparation"]):
            preparation_work_cost = effective_area * float(preparation["labor_price_per_m2"] or 0.0)
            preparation_material_cost = effective_area * float(preparation["material_price_per_m2"] or 0.0)
            preparation_primer_qty = effective_area * float(preparation["primer_consumption_per_m2"] or 0.0)
            preparation_primer_cost = preparation_primer_qty * float(preparation["primer_price_per_unit"] or 0.0)
        preparation_total_cost = preparation_work_cost + preparation_material_cost

        glue_qty = purchase_area * float(covering["glue_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        glue_cost = glue_qty * float(covering["glue_price_per_unit"] or 0.0) if selected and covering else 0.0
        covering_primer_qty = (
            purchase_area * float(covering["primer_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        )
        covering_primer_cost = (
            covering_primer_qty * float(covering["primer_price_per_unit"] or 0.0) if selected and covering else 0.0
        )
        primer_qty = preparation_primer_qty + covering_primer_qty
        primer_cost = preparation_primer_cost + covering_primer_cost
        putty_qty = purchase_area * float(covering["putty_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        putty_cost = putty_qty * float(covering["putty_price_per_unit"] or 0.0) if selected and covering else 0.0
        mesh_qty = purchase_area * float(covering["mesh_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        mesh_cost = mesh_qty * float(covering["mesh_price_per_unit"] or 0.0) if selected and covering else 0.0
        demolition_cost = (
            effective_area * float(config["demolition_price_per_m2"] or 0.0)
            if selected and bool(config["include_demolition"])
            else 0.0
        )
        instrument_cost = (
            effective_area * float(covering["instrument_price_per_m2"] or 0.0) if selected and covering else 0.0
        )

        total_cost = (
            material_cost
            + installation_cost
            + preparation_total_cost
            + glue_cost
            + primer_cost
            + putty_cost
            + mesh_cost
            + demolition_cost
            + instrument_cost
        )

        if selected:
            summary["rooms_count"] += 1
            summary["total_area_m2"] += effective_area
            summary["total_purchase_area_m2"] += purchase_area
            summary["total_material_cost"] += material_cost
            summary["total_installation_cost"] += installation_cost
            summary["total_preparation_work_cost"] += preparation_work_cost
            summary["total_preparation_material_cost"] += preparation_material_cost
            summary["total_preparation_cost"] += preparation_total_cost
            summary["total_glue_qty"] += glue_qty
            summary["total_glue_cost"] += glue_cost
            summary["total_primer_qty"] += primer_qty
            summary["total_primer_cost"] += primer_cost
            summary["total_putty_qty"] += putty_qty
            summary["total_putty_cost"] += putty_cost
            summary["total_mesh_qty"] += mesh_qty
            summary["total_mesh_cost"] += mesh_cost
            summary["total_demolition_cost"] += demolition_cost
            summary["total_instrument_cost"] += instrument_cost
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

            layout_title = str(layout["title"]) if layout else "Базовая"
            covering_title = str(covering["title"]) if covering else "Отделка стен"
            add_spec(
                "work",
                f"Отделка стен: {covering_title}, {layout_title.lower()}",
                "м²",
                effective_area,
                installation_cost,
            )
            add_spec("material", covering_title, "м²", purchase_area, material_cost)
            if preparation and bool(config["include_preparation"]):
                prep_title = str(preparation["title"])
                add_spec("work", f"Подготовка стен: {prep_title}", "м²", effective_area, preparation_work_cost)
                add_spec(
                    "material",
                    f"Материалы подготовки стен: {prep_title}",
                    "м²",
                    effective_area,
                    preparation_material_cost,
                )
            add_spec("material", "Клей", summary["glue_unit"], glue_qty, glue_cost)
            add_spec("material", "Грунтовка", summary["primer_unit"], primer_qty, primer_cost)
            add_spec("material", "Шпаклёвка", summary["putty_unit"], putty_qty, putty_cost)
            add_spec("material", "Стеклохолст / сетка", summary["mesh_unit"], mesh_qty, mesh_cost)
            add_spec("work", "Демонтаж старой отделки стен", "м²", effective_area, demolition_cost)
            add_spec("material", "Расход инструмента", "м²", effective_area, instrument_cost)

        rooms_payload.append(
            {
                "room_id": room_id,
                "room_name": room["name"],
                "selected": selected,
                "covering_id": int(selected_row["covering_id"])
                if selected and selected_row.get("covering_id")
                else None,
                "covering_title": covering["title"] if covering else None,
                "preparation_id": int(selected_row["preparation_id"])
                if selected and selected_row.get("preparation_id")
                else None,
                "preparation_title": preparation["title"] if preparation else None,
                "layout_id": int(selected_row["layout_id"]) if selected and selected_row.get("layout_id") else None,
                "layout_title": layout["title"] if layout else None,
                "base_area_m2": base_area,
                "effective_area_m2": effective_area,
                "area_m2_override": selected_row["area_m2_override"] if selected else None,
                "base_waste_percent": base_waste,
                "extra_waste_percent": extra_waste,
                "total_waste_percent": total_waste,
                "purchase_area_m2": purchase_area,
                "material_price_per_m2": material_price,
                "base_labor_price_per_m2": base_labor,
                "layout_multiplier": layout_multiplier,
                "labor_price_per_m2": labor_with_coef,
                "material_cost": material_cost,
                "installation_cost": installation_cost,
                "preparation_work_cost": preparation_work_cost,
                "preparation_material_cost": preparation_material_cost,
                "preparation_total_cost": preparation_total_cost,
                "glue_qty": glue_qty,
                "glue_unit": summary["glue_unit"],
                "glue_cost": glue_cost,
                "primer_qty": primer_qty,
                "primer_unit": summary["primer_unit"],
                "primer_cost": primer_cost,
                "putty_qty": putty_qty,
                "putty_unit": summary["putty_unit"],
                "putty_cost": putty_cost,
                "mesh_qty": mesh_qty,
                "mesh_unit": summary["mesh_unit"],
                "mesh_cost": mesh_cost,
                "demolition_cost": demolition_cost,
                "instrument_cost": instrument_cost,
                "total_cost": total_cost,
                "note": selected_row["note"] if selected else None,
            }
        )

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

    return {
        "config": config,
        "coverings": coverings,
        "preparations": preparations,
        "layouts": layouts,
        "rooms": rooms_payload,
        "summary": summary,
        "specification": list(spec_map.values()),
    }
