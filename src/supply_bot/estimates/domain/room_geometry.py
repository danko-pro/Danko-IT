from __future__ import annotations

from math import sqrt
from typing import Any


def estimate_room_stats(
    *,
    room: dict[str, Any],
    walls: list[dict[str, Any]],
    floor_sections: list[dict[str, Any]],
    openings: list[dict[str, Any]],
    door_area_m2: float,
) -> dict[str, Any]:
    if room.get("manual_floor_area_m2") is not None:
        floor_area_m2 = max(0.0, float(room["manual_floor_area_m2"]))
    else:
        floor_area_m2 = sum(
            max(0.0, float(section["length_m"])) * max(0.0, float(section["width_m"]))
            for section in floor_sections
            if section.get("length_m") is not None and section.get("width_m") is not None
        )
    measured_perimeter_m = sum(
        max(0.0, float(wall["length_m"])) for wall in walls if wall.get("length_m") is not None
    )
    auto_perimeter_calc = bool(room.get("auto_perimeter_calc"))
    perimeter_factor = max(1.0, float(room.get("perimeter_factor") or 1.15))
    if measured_perimeter_m > 0:
        perimeter_m = measured_perimeter_m
        perimeter_source = "measured"
    elif auto_perimeter_calc and floor_area_m2 > 0:
        perimeter_m = 4.0 * sqrt(floor_area_m2) * perimeter_factor
        perimeter_source = "estimated"
    else:
        perimeter_m = 0.0
        perimeter_source = "missing"
    ceiling_height_m = max(0.0, float(room.get("ceiling_height_m") or 0))
    wall_area_gross_m2 = perimeter_m * ceiling_height_m
    openings_area_m2 = sum(estimate_opening_area(opening) for opening in openings)
    wall_area_net_m2 = max(0.0, wall_area_gross_m2 - openings_area_m2 - door_area_m2)
    return {
        "perimeter_m": perimeter_m,
        "floor_area_m2": floor_area_m2,
        "wall_area_gross_m2": wall_area_gross_m2,
        "openings_area_m2": openings_area_m2,
        "door_area_m2": door_area_m2,
        "wall_area_net_m2": wall_area_net_m2,
        "is_perimeter_estimated": 1.0 if perimeter_source == "estimated" else 0.0,
        "perimeter_source": perimeter_source,
    }


def estimate_opening_area(opening: dict[str, Any]) -> float:
    if opening.get("area_m2") is not None:
        return max(0.0, float(opening["area_m2"]))
    width_m = opening.get("width_m")
    height_m = opening.get("height_m")
    quantity_raw = opening.get("quantity")
    quantity = 1.0 if quantity_raw is None else max(0.0, float(quantity_raw))
    if width_m is None or height_m is None:
        return 0.0
    return max(0.0, float(width_m)) * max(0.0, float(height_m)) * quantity


__all__ = ["estimate_opening_area", "estimate_room_stats"]
