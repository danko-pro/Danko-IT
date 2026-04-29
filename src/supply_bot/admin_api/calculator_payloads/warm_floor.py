from __future__ import annotations

from math import ceil
from typing import Any

from supply_bot.admin_api.calculator_payloads.warm_floor_materials import items_total, load_material_items
from supply_bot.storage import BotStorage


async def _estimate_warm_floor_payload(
    storage: BotStorage,
    project: dict[str, Any],
    room_payloads: list[dict[str, Any]],
) -> dict[str, Any]:
    project_id = int(project["id"])
    config = await storage.ensure_estimate_warm_floor_config(project_id)
    selected_rows = await storage.list_estimate_warm_floor_rooms(project_id)
    selected_by_room = {int(row["room_id"]): row for row in selected_rows}

    rooms_payload: list[dict[str, Any]] = []
    summary = {
        "rooms_count": 0,
        "total_area_m2": 0.0,
        "total_pipe_m": 0.0,
        "total_contours": 0,
        "floor_work_total": 0.0,
        "pipe_material_total": 0.0,
        "manifold_needed": False,
        "manifold_work_total": 0.0,
        "manifold_material_total": 0.0,
        "pump_needed": False,
        "pump_work_total": 0.0,
        "pump_material_total": 0.0,
        "consumable_material_total": 0.0,
        "work_total": 0.0,
        "material_total": 0.0,
        "grand_total": 0.0,
        "price_per_m2": None,
    }

    work_price = float(config["work_price_per_m2"])
    pipe_per_m2 = float(config["pipe_m_per_m2"])
    max_contour_area = max(0.1, float(config["max_contour_area_m2"]))
    small_zone_area = max(0.0, float(config["small_zone_area_m2"]))
    pipe_price = float(config["pipe_price_per_m"])
    pipe_title = str(config.get("pipe_material_title") or "Труба PEX-a 16x2 для водяного тёплого пола")
    manifold_items = load_material_items(
        config.get("manifold_material_items_json"),
        [
            {"title": "Коллекторная группа с расходомерами", "unit": "компл.", "quantity": 1, "amount": 12000},
            {"title": "Шкаф, крепёж и фитинги коллектора", "unit": "компл.", "quantity": 1, "amount": 8000},
        ],
    )
    pump_items = load_material_items(
        config.get("pump_material_items_json"),
        [
            {"title": "Насосно-смесительный узел", "unit": "компл.", "quantity": 1, "amount": 18000},
            {"title": "Запорная арматура и фитинги насосного узла", "unit": "компл.", "quantity": 1, "amount": 7500},
        ],
    )
    consumable_items = load_material_items(
        config.get("consumable_material_items_json"),
        [
            {"title": "Крепёж трубы тёплого пола", "unit": "компл.", "quantity": 1, "amount": 2500},
            {"title": "Демпферная лента и расходные фитинги", "unit": "компл.", "quantity": 1, "amount": 3500},
        ],
    )

    for room in room_payloads:
        room_id = int(room["id"])
        selected_row = selected_by_room.get(room_id)
        base_area_m2 = float(room["floor_area_m2"] or 0.0)
        area_override = (
            float(selected_row["area_m2_override"])
            if selected_row and selected_row.get("area_m2_override") is not None
            else None
        )
        effective_area_m2 = max(0.0, area_override if area_override is not None else base_area_m2)
        selected = selected_row is not None
        contours = int(ceil(effective_area_m2 / max_contour_area)) if selected and effective_area_m2 > 0 else 0
        pipe_m = effective_area_m2 * pipe_per_m2 if selected else 0.0
        work_total = effective_area_m2 * work_price if selected else 0.0
        zone_label = ""
        if selected and effective_area_m2 > 0:
            if effective_area_m2 <= small_zone_area:
                zone_label = "Малая зона"
            elif contours == 1:
                zone_label = "1 контур"
            else:
                zone_label = f"{contours} {_plural_contours(contours)}"
            summary["rooms_count"] += 1
            summary["total_area_m2"] += effective_area_m2
            summary["total_pipe_m"] += pipe_m
            summary["total_contours"] += contours
            summary["floor_work_total"] += work_total
            summary["pipe_material_total"] += pipe_m * pipe_price

        rooms_payload.append(
            {
                "room_id": room_id,
                "room_name": room["name"],
                "selected": selected,
                "base_floor_area_m2": base_area_m2,
                "area_m2_override": area_override,
                "effective_area_m2": effective_area_m2,
                "pipe_m": pipe_m,
                "contours": contours,
                "zone_label": zone_label,
                "work_total": work_total,
                "note": selected_row["note"] if selected_row else None,
            }
        )

    summary["manifold_needed"] = summary["rooms_count"] > 1 or summary["total_contours"] >= 2
    if summary["manifold_needed"]:
        summary["manifold_work_total"] = float(config["manifold_work_price"])
        summary["manifold_material_total"] = items_total(manifold_items) or float(config["manifold_material_price"])

    summary["pump_needed"] = summary["rooms_count"] >= int(config["pump_rooms_threshold"]) or summary[
        "total_contours"
    ] >= int(config["pump_contours_threshold"])
    if summary["pump_needed"]:
        summary["pump_work_total"] = float(config["pump_work_price"])
        summary["pump_material_total"] = items_total(pump_items) or float(config["pump_material_price"])
    if summary["total_area_m2"] > 0:
        summary["consumable_material_total"] = items_total(consumable_items)

    summary["work_total"] = summary["floor_work_total"] + summary["manifold_work_total"] + summary["pump_work_total"]
    summary["material_total"] = (
        summary["pipe_material_total"]
        + summary["manifold_material_total"]
        + summary["pump_material_total"]
        + summary["consumable_material_total"]
    )
    summary["grand_total"] = summary["work_total"] + summary["material_total"]
    if summary["total_area_m2"] > 0:
        summary["price_per_m2"] = summary["grand_total"] / summary["total_area_m2"]

    specification: list[dict[str, Any]] = []
    if summary["total_area_m2"] > 0:
        specification.append(
            {
                "code": "floor_work",
                "kind": "work",
                "title": "Устройство водяного теплого пола",
                "unit": "м²",
                "quantity": summary["total_area_m2"],
                "amount": summary["floor_work_total"],
            }
        )
    if summary["total_pipe_m"] > 0:
        specification.append(
            {
                "code": "pipe_material",
                "kind": "material",
                "title": "Труба для водяного теплого пола",
                "unit": "м.п.",
                "quantity": summary["total_pipe_m"],
                "amount": summary["pipe_material_total"],
            }
        )
    if summary["manifold_needed"]:
        specification.extend(
            [
                {
                    "code": "manifold_work",
                    "kind": "work",
                    "title": "Монтаж распределительной гребенки теплого пола",
                    "unit": "компл.",
                    "quantity": 1,
                    "amount": summary["manifold_work_total"],
                },
                {
                    "code": "manifold_material",
                    "kind": "material",
                    "title": "Комплект распределительной гребенки теплого пола",
                    "unit": "компл.",
                    "quantity": 1,
                    "amount": summary["manifold_material_total"],
                },
            ]
        )
    if summary["pump_needed"]:
        specification.extend(
            [
                {
                    "code": "pump_work",
                    "kind": "work",
                    "title": "Монтаж насосно-смесительного узла теплого пола",
                    "unit": "компл.",
                    "quantity": 1,
                    "amount": summary["pump_work_total"],
                },
                {
                    "code": "pump_material",
                    "kind": "material",
                    "title": "Комплект насосно-смесительного узла теплого пола",
                    "unit": "компл.",
                    "quantity": 1,
                    "amount": summary["pump_material_total"],
                },
            ]
        )

    for item in specification:
        if item.get("code") == "pipe_material":
            item["title"] = pipe_title
        elif item.get("code") == "manifold_material":
            item["children"] = manifold_items
        elif item.get("code") == "pump_material":
            item["children"] = pump_items
    if summary["consumable_material_total"] > 0:
        specification.append(
            {
                "code": "consumable_material",
                "kind": "material",
                "title": "Расходные материалы тёплого пола",
                "unit": "компл.",
                "quantity": 1,
                "amount": summary["consumable_material_total"],
                "children": consumable_items,
            }
        )

    return {
        "config": config,
        "rooms": rooms_payload,
        "summary": summary,
        "specification": specification,
    }


def _plural_contours(value: int) -> str:
    remainder_10 = value % 10
    remainder_100 = value % 100
    if remainder_10 == 1 and remainder_100 != 11:
        return "контур"
    if remainder_10 in {2, 3, 4} and remainder_100 not in {12, 13, 14}:
        return "контура"
    return "контуров"
