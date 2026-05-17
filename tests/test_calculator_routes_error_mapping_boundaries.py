from __future__ import annotations

import re
import unittest
from pathlib import Path

CALCULATOR_ROUTES_ROOT = (
    Path(__file__).resolve().parents[1] / "src" / "supply_bot" / "admin_api" / "calculator_routes"
)

MIGRATED_ROUTE_FILES = (
    "core.py",
    "warm_floor.py",
    "flooring.py",
    "wall_finish.py",
    "doors.py",
    "ceilings.py",
)

VALUE_ERROR_EXCEPT_PATTERN = re.compile(r"except\s+(?:ValueError|\([^)]*ValueError[^)]*\))")


class CalculatorRoutesErrorMappingBoundaryTests(unittest.TestCase):
    def test_migrated_calculator_routes_do_not_manually_map_value_error(self) -> None:
        violations: list[str] = []
        for filename in MIGRATED_ROUTE_FILES:
            path = CALCULATOR_ROUTES_ROOT / filename
            text = path.read_text(encoding="utf-8")
            if VALUE_ERROR_EXCEPT_PATTERN.search(text):
                violations.append(filename)

        self.assertEqual(violations, [])
