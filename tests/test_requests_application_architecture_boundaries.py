from __future__ import annotations

import unittest
from pathlib import Path

APPLICATION_ROOT = Path(__file__).resolve().parents[1] / "src" / "supply_bot" / "requests" / "application"

FORBIDDEN_TOKENS = (
    "from fastapi",
    "import fastapi",
    "HTTPException",
    "from sqlalchemy",
    "import sqlalchemy",
    "load_settings",
    "admin_api",
)

FORBIDDEN_FASTAPI_TYPES = (
    "from fastapi import Request",
    "from fastapi import Response",
    "from starlette.requests import Request",
    "from starlette.responses import Response",
)


class RequestsApplicationArchitectureBoundaryTests(unittest.TestCase):
    def test_requests_application_python_files_do_not_import_forbidden_dependencies(self) -> None:
        violations: list[str] = []
        for path in sorted(APPLICATION_ROOT.rglob("*.py")):
            text = path.read_text(encoding="utf-8")
            for token in FORBIDDEN_TOKENS + FORBIDDEN_FASTAPI_TYPES:
                if token in text:
                    violations.append(f"{path.relative_to(APPLICATION_ROOT)} contains {token!r}")

        self.assertEqual(violations, [])

    def test_requests_application_python_files_do_not_raise_raw_value_error(self) -> None:
        violations: list[str] = []
        for path in sorted(APPLICATION_ROOT.rglob("*.py")):
            text = path.read_text(encoding="utf-8")
            if "raise ValueError(" in text:
                violations.append(f"{path.relative_to(APPLICATION_ROOT)} raises raw ValueError")

        self.assertEqual(violations, [])
