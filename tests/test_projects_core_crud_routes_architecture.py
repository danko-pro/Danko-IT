from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
CORE_ROUTE_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "project_routes" / "core.py"


class ProjectsCoreCrudRoutesArchitectureTests(unittest.TestCase):
    def test_core_crud_routes_call_application_use_cases(self) -> None:
        text = CORE_ROUTE_PATH.read_text(encoding="utf-8")

        for use_case_name in (
            "ListProjectsUseCase",
            "GetProjectDetailUseCase",
            "CreateProjectUseCase",
            "UpdateProjectUseCase",
            "DeleteProjectUseCase",
        ):
            self.assertIn(use_case_name, text)

        self.assertGreaterEqual(text.count("resolve_application_result("), 5)

    def test_core_crud_route_no_longer_imports_moved_business_helpers(self) -> None:
        text = CORE_ROUTE_PATH.read_text(encoding="utf-8")

        forbidden_tokens = (
            "build_project_create_values",
            "build_project_update_values",
            "require_estimate_project",
            "load_project_payload",
            "ProjectValidationError",
            "raise_bad_request",
            "resolve_or_server_error",
        )
        violations = [token for token in forbidden_tokens if token in text]

        self.assertEqual(violations, [])
