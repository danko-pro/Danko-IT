from __future__ import annotations

import re
import unittest
from pathlib import Path

APPLICATION_ROOT = Path(__file__).resolve().parents[1] / "src" / "supply_bot" / "estimates" / "application"

FORBIDDEN_TOKENS = (
    "from fastapi",
    "import fastapi",
    "HTTPException",
    "Request",
    "Response",
    "load_settings",
    "sqlalchemy",
    "supply_bot.admin_api.calculator_routes",
)

RAW_VALUE_ERROR_PATTERN = re.compile(r"^\s*raise\s+ValueError\s*\(", re.MULTILINE)


class EstimatesApplicationArchitectureBoundaryTests(unittest.TestCase):
    def test_application_python_files_do_not_import_forbidden_runtime_dependencies(self) -> None:
        violations: list[str] = []
        for path in sorted(APPLICATION_ROOT.rglob("*.py")):
            text = path.read_text(encoding="utf-8")
            for token in FORBIDDEN_TOKENS:
                if token in text:
                    violations.append(f"{path.relative_to(APPLICATION_ROOT)} contains {token!r}")

        self.assertEqual(violations, [])

    def test_application_python_files_do_not_raise_raw_value_error(self) -> None:
        violations: list[str] = []
        for path in sorted(APPLICATION_ROOT.rglob("*.py")):
            text = path.read_text(encoding="utf-8")
            if RAW_VALUE_ERROR_PATTERN.search(text):
                violations.append(str(path.relative_to(APPLICATION_ROOT)))

        self.assertEqual(violations, [])
