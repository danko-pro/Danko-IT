from __future__ import annotations

import unittest

from supply_bot.estimates.domain.room_geometry import estimate_opening_area, estimate_room_stats


def _room(**overrides):
    data = {
        "manual_floor_area_m2": None,
        "auto_perimeter_calc": False,
        "perimeter_factor": 1.15,
        "ceiling_height_m": 2.7,
    }
    data.update(overrides)
    return data


class EstimateRoomGeometryTests(unittest.TestCase):
    def test_manual_floor_area_takes_priority_over_sections(self) -> None:
        stats = estimate_room_stats(
            room=_room(manual_floor_area_m2=12.5),
            walls=[],
            floor_sections=[{"length_m": 10, "width_m": 10}],
            openings=[],
            door_area_m2=0.0,
        )

        self.assertEqual(stats["floor_area_m2"], 12.5)

    def test_floor_area_falls_back_to_floor_sections(self) -> None:
        stats = estimate_room_stats(
            room=_room(),
            walls=[],
            floor_sections=[
                {"length_m": 2, "width_m": 3},
                {"length_m": -5, "width_m": 4},
                {"length_m": None, "width_m": 8},
            ],
            openings=[],
            door_area_m2=0.0,
        )

        self.assertEqual(stats["floor_area_m2"], 6.0)

    def test_measured_walls_set_measured_perimeter_source(self) -> None:
        stats = estimate_room_stats(
            room=_room(auto_perimeter_calc=True, manual_floor_area_m2=16, perimeter_factor=2),
            walls=[{"length_m": 4}, {"length_m": 3}, {"length_m": -10}],
            floor_sections=[],
            openings=[],
            door_area_m2=0.0,
        )

        self.assertEqual(stats["perimeter_m"], 7.0)
        self.assertEqual(stats["perimeter_source"], "measured")
        self.assertEqual(stats["is_perimeter_estimated"], 0.0)

    def test_auto_perimeter_uses_floor_area_when_measured_walls_are_missing(self) -> None:
        stats = estimate_room_stats(
            room=_room(auto_perimeter_calc=True, manual_floor_area_m2=9, perimeter_factor=1.2),
            walls=[],
            floor_sections=[],
            openings=[],
            door_area_m2=0.0,
        )

        self.assertAlmostEqual(stats["perimeter_m"], 14.4)
        self.assertEqual(stats["perimeter_source"], "estimated")
        self.assertEqual(stats["is_perimeter_estimated"], 1.0)

    def test_missing_perimeter_source_when_no_walls_and_auto_calc_disabled(self) -> None:
        stats = estimate_room_stats(
            room=_room(auto_perimeter_calc=False, manual_floor_area_m2=9),
            walls=[],
            floor_sections=[],
            openings=[],
            door_area_m2=0.0,
        )

        self.assertEqual(stats["perimeter_m"], 0.0)
        self.assertEqual(stats["perimeter_source"], "missing")

    def test_opening_area_uses_manual_area_when_present(self) -> None:
        self.assertEqual(
            estimate_opening_area({"area_m2": 2.4, "width_m": 10, "height_m": 10, "quantity": 10}),
            2.4,
        )

    def test_opening_area_uses_dimensions_and_quantity_without_manual_area(self) -> None:
        self.assertEqual(estimate_opening_area({"width_m": 0.8, "height_m": 2.0, "quantity": 2}), 3.2)
        self.assertEqual(estimate_opening_area({"width_m": 0.8, "height_m": 2.0, "quantity": None}), 1.6)

    def test_wall_area_net_is_not_negative(self) -> None:
        stats = estimate_room_stats(
            room=_room(ceiling_height_m=2.0),
            walls=[{"length_m": 2}],
            floor_sections=[],
            openings=[{"area_m2": 20}],
            door_area_m2=10.0,
        )

        self.assertEqual(stats["wall_area_net_m2"], 0.0)

    def test_door_area_is_subtracted_from_gross_wall_area(self) -> None:
        stats = estimate_room_stats(
            room=_room(ceiling_height_m=2.5),
            walls=[{"length_m": 10}],
            floor_sections=[],
            openings=[{"area_m2": 4}],
            door_area_m2=3.0,
        )

        self.assertEqual(stats["wall_area_gross_m2"], 25.0)
        self.assertEqual(stats["openings_area_m2"], 4.0)
        self.assertEqual(stats["door_area_m2"], 3.0)
        self.assertEqual(stats["wall_area_net_m2"], 18.0)

    def test_negative_and_empty_values_are_clamped_like_before(self) -> None:
        stats = estimate_room_stats(
            room=_room(manual_floor_area_m2=-4, auto_perimeter_calc=True, ceiling_height_m=-2, perimeter_factor=0.5),
            walls=[{"length_m": -3}, {"length_m": None}],
            floor_sections=[{"length_m": -2, "width_m": 5}],
            openings=[
                {"area_m2": -3},
                {"width_m": -1, "height_m": 2, "quantity": 3},
                {"width_m": 1, "height_m": None, "quantity": 3},
            ],
            door_area_m2=0.0,
        )

        self.assertEqual(stats["floor_area_m2"], 0.0)
        self.assertEqual(stats["perimeter_m"], 0.0)
        self.assertEqual(stats["wall_area_gross_m2"], 0.0)
        self.assertEqual(stats["openings_area_m2"], 0.0)
        self.assertEqual(stats["wall_area_net_m2"], 0.0)


if __name__ == "__main__":
    unittest.main()
