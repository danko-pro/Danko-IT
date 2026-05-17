from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ADVANCES_ROUTE_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "project_routes" / "advances.py"


class ProjectsAdvancesRoutesArchitectureTests(unittest.TestCase):
    def test_read_create_advances_routes_call_application_use_cases(self) -> None:
        text = ADVANCES_ROUTE_PATH.read_text(encoding="utf-8")

        self.assertIn("ListProjectAdvancesUseCase", text)
        self.assertIn("CreateProjectAdvanceUseCase", text)
        self.assertIn("delete_project_advance_response", text)
        self.assertGreaterEqual(text.count("resolve_application_result("), 2)

    def test_read_create_advances_routes_no_longer_import_moved_business_helpers(self) -> None:
        text = ADVANCES_ROUTE_PATH.read_text(encoding="utf-8")

        forbidden_tokens = (
            "create_project_advance_response",
            "build_project_advance_create_values",
            "build_project_advance_payload",
            "ProjectValidationError",
            "raise_bad_request",
            "require_project",
        )
        violations = [token for token in forbidden_tokens if token in text]

        self.assertEqual(violations, [])
