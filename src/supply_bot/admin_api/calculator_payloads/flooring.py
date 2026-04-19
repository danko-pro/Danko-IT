from __future__ import annotations

from typing import Any

from supply_bot.storage import BotStorage


async def _estimate_flooring_payload(
    storage: BotStorage,
    project: dict[str, Any],
    room_payloads: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_flooring_config(project_id)
    coverings = await storage.list_estimate_flooring_coverings()
    preparations = await storage.list_estimate_flooring_preparations()
    layouts = await storage.list_estimate_flooring_layouts()
    selected_rows = await storage.list_estimate_flooring_rooms(project_id)

    coverings_by_id = {int(item["id"]): item for item in coverings}
    preparations_by_id = {int(item["id"]): item for item in preparations}
    layouts_by_id = {int(item["id"]): item for item in layouts}
    rows_by_room = {int(item["room_id"]): item for item in selected_rows}

    summary: dict[str, Any] = {
        "rooms_count": 0,
        "total_area_m2": 0.0,
        "total_purchase_area_m2": 0.0,
        "total_material_cost": 0.0,
        "total_installation_cost": 0.0,
        "total_preparation_work_cost": 0.0,
        "total_preparation_material_cost": 0.0,
        "total_preparation_cost": 0.0,
        "total_underlay_qty": 0.0,
        "underlay_unit": "м²",
        "total_underlay_cost": 0.0,
        "total_glue_qty": 0.0,
        "glue_unit": "кг",
        "total_glue_cost": 0.0,
        "total_primer_qty": 0.0,
        "primer_unit": "л",
        "total_primer_cost": 0.0,
        "total_svp_qty": 0.0,
        "svp_unit": "шт",
        "total_svp_cost": 0.0,
        "total_grout_qty": 0.0,
        "grout_unit": "кг",
        "total_grout_cost": 0.0,
        "total_plinth_m": 0.0,
        "total_plinth_material_cost": 0.0,
        "total_plinth_install_cost": 0.0,
        "total_demolition_cost": 0.0,
        "threshold_profile_count": int(config["threshold_profile_count"]),
        "threshold_profile_cost": 0.0,
        "total_instrument_cost": 0.0,
        "work_total": 0.0,
        "material_total": 0.0,
        "grand_total": 0.0,
        "price_per_m2": None,
    }

    rooms_payload: list[dict[str, Any]] = []
    spec_map: dict[tuple[str, str, str, str], dict[str, Any]] = {}

    def add_spec(kind: str, title: str, unit: str, quantity: float, amount: float) -> None:
        if quantity <= 0 or amount <= 0:
            return
        key = (kind, title, unit, "")
        current = spec_map.setdefault(
            key,
            {"kind": kind, "title": title, "unit": unit, "quantity": 0.0, "amount": 0.0},
        )
        current["quantity"] += quantity
        current["amount"] += amount

    for room in room_payloads:
        room_id = int(room["id"])
        selected_row = rows_by_room.get(room_id)
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

        base_area = float(room["floor_area_m2"] or 0.0)
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
        base_perimeter = float(room["perimeter_m"] or 0.0)
        effective_perimeter = (
            max(
                0.0,
                float(selected_row["perimeter_m_override"])
                if selected and selected_row.get("perimeter_m_override") is not None
                else base_perimeter,
            )
            if selected
            else 0.0
        )
        plinth_m = (
            max(
                0.0,
                float(selected_row["plinth_m_override"])
                if selected and selected_row.get("plinth_m_override") is not None
                else effective_perimeter,
            )
            if selected
            else 0.0
        )

        base_waste = float(covering["base_waste_percent"]) if covering else 0.0
        extra_waste = float(layout["extra_waste_percent"]) if layout else 0.0
        total_waste = base_waste + extra_waste
        purchase_area = effective_area * (1 + total_waste / 100.0) if selected else 0.0

        material_price = float(covering["material_price_per_m2"]) if covering else 0.0
        base_labor = float(covering["labor_price_per_m2"]) if covering else 0.0
        layout_multiplier = float(layout["labor_multiplier"]) if layout else 1.0
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

        underlay_qty = 0.0
        underlay_cost = 0.0
        if selected and covering and bool(config["include_underlay"]) and str(covering["underlay_mode"]) != "none":
            underlay_qty = effective_area * float(covering["underlay_consumption_per_m2"] or 1.0)
            underlay_cost = underlay_qty * float(config["underlay_price_per_m2"] or 0.0)

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
        svp_qty = purchase_area * float(covering["svp_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        svp_cost = svp_qty * float(covering["svp_price_per_unit"] or 0.0) if selected and covering else 0.0
        grout_qty = purchase_area * float(covering["grout_consumption_per_m2"] or 0.0) if selected and covering else 0.0
        grout_cost = grout_qty * float(covering["grout_price_per_unit"] or 0.0) if selected and covering else 0.0

        plinth_qty = 0.0
        plinth_material_cost = 0.0
        plinth_install_cost = 0.0
        if selected and covering and bool(config["include_plinth"]) and bool(covering["needs_plinth"]):
            plinth_qty = plinth_m
            plinth_material_cost = plinth_qty * float(config["plinth_material_price_per_m"] or 0.0)
            plinth_install_cost = plinth_qty * float(config["plinth_install_price_per_m"] or 0.0)

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
            + underlay_cost
            + glue_cost
            + primer_cost
            + svp_cost
            + grout_cost
            + plinth_material_cost
            + plinth_install_cost
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
            summary["total_underlay_qty"] += underlay_qty
            summary["total_underlay_cost"] += underlay_cost
            summary["total_glue_qty"] += glue_qty
            summary["total_glue_cost"] += glue_cost
            summary["total_primer_qty"] += primer_qty
            summary["total_primer_cost"] += primer_cost
            summary["total_svp_qty"] += svp_qty
            summary["total_svp_cost"] += svp_cost
            summary["total_grout_qty"] += grout_qty
            summary["total_grout_cost"] += grout_cost
            summary["total_plinth_m"] += plinth_qty
            summary["total_plinth_material_cost"] += plinth_material_cost
            summary["total_plinth_install_cost"] += plinth_install_cost
            summary["total_demolition_cost"] += demolition_cost
            summary["total_instrument_cost"] += instrument_cost
            summary["glue_unit"] = (
                str(covering["glue_unit"] or summary["glue_unit"]) if covering else summary["glue_unit"]
            )
            summary["primer_unit"] = str(
                preparation["primer_unit"]
                if preparation and preparation.get("primer_unit")
                else (covering["primer_unit"] if covering else summary["primer_unit"])
            )
            summary["svp_unit"] = str(covering["svp_unit"] or summary["svp_unit"]) if covering else summary["svp_unit"]
            summary["grout_unit"] = (
                str(covering["grout_unit"] or summary["grout_unit"]) if covering else summary["grout_unit"]
            )

            layout_title = str(layout["title"]) if layout else "Прямая"
            covering_title = str(covering["title"]) if covering else "Покрытие"
            add_spec(
                "work", f"Укладка {covering_title}, {layout_title.lower()}", "м²", effective_area, installation_cost
            )
            add_spec("material", covering_title, "м²", purchase_area, material_cost)
            if preparation and bool(config["include_preparation"]):
                prep_title = str(preparation["title"])
                add_spec("work", f"Подготовка основания: {prep_title}", "м²", effective_area, preparation_work_cost)
                add_spec(
                    "material", f"Материалы подготовки: {prep_title}", "м²", effective_area, preparation_material_cost
                )
            add_spec("material", "Подложка", "м²", underlay_qty, underlay_cost)
            add_spec("material", "Клей", str(covering["glue_unit"]) if covering else "кг", glue_qty, glue_cost)
            add_spec("material", "Грунтовка", summary["primer_unit"], primer_qty, primer_cost)
            add_spec("material", "СВП", str(covering["svp_unit"]) if covering else "шт", svp_qty, svp_cost)
            add_spec("material", "Затирка", str(covering["grout_unit"]) if covering else "кг", grout_qty, grout_cost)
            add_spec("material", "Плинтус", "м.п.", plinth_qty, plinth_material_cost)
            add_spec("work", "Монтаж плинтуса", "м.п.", plinth_qty, plinth_install_cost)
            add_spec("work", "Демонтаж напольного покрытия", "м²", effective_area, demolition_cost)
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
                "base_perimeter_m": base_perimeter,
                "effective_perimeter_m": effective_perimeter,
                "plinth_m": plinth_qty,
                "area_m2_override": selected_row["area_m2_override"] if selected else None,
                "perimeter_m_override": selected_row["perimeter_m_override"] if selected else None,
                "plinth_m_override": selected_row["plinth_m_override"] if selected else None,
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
                "underlay_qty": underlay_qty,
                "underlay_cost": underlay_cost,
                "glue_qty": glue_qty,
                "glue_unit": covering["glue_unit"] if covering else "кг",
                "glue_cost": glue_cost,
                "primer_qty": primer_qty,
                "primer_unit": summary["primer_unit"],
                "primer_cost": primer_cost,
                "svp_qty": svp_qty,
                "svp_unit": covering["svp_unit"] if covering else "шт",
                "svp_cost": svp_cost,
                "grout_qty": grout_qty,
                "grout_unit": covering["grout_unit"] if covering else "кг",
                "grout_cost": grout_cost,
                "plinth_material_cost": plinth_material_cost,
                "plinth_install_cost": plinth_install_cost,
                "demolition_cost": demolition_cost,
                "instrument_cost": instrument_cost,
                "total_cost": total_cost,
                "note": selected_row["note"] if selected else None,
            }
        )

    if summary["rooms_count"] > 0 and summary["threshold_profile_count"] > 0:
        summary["threshold_profile_cost"] = summary["threshold_profile_count"] * float(
            config["threshold_profile_price"] or 0.0
        )
        add_spec(
            "material",
            "Порожек / стыковочный профиль",
            "шт",
            summary["threshold_profile_count"],
            summary["threshold_profile_cost"],
        )

    summary["work_total"] = (
        summary["total_installation_cost"]
        + summary["total_preparation_work_cost"]
        + summary["total_plinth_install_cost"]
        + summary["total_demolition_cost"]
    )
    summary["material_total"] = (
        summary["total_material_cost"]
        + summary["total_preparation_material_cost"]
        + summary["total_underlay_cost"]
        + summary["total_glue_cost"]
        + summary["total_primer_cost"]
        + summary["total_svp_cost"]
        + summary["total_grout_cost"]
        + summary["total_plinth_material_cost"]
        + summary["threshold_profile_cost"]
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
