from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
LEDGER_ROUTE_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "project_routes" / "ledger_entries.py"


class ProjectsLedgerEntriesRoutesArchitectureTests(unittest.TestCase):
    def test_read_create_update_ledger_routes_call_application_use_cases(self) -> None:
        text = LEDGER_ROUTE_PATH.read_text(encoding="utf-8")

        self.assertIn("ListProjectLedgerEntriesUseCase", text)
        self.assertIn("CreateProjectLedgerEntryUseCase", text)
        self.assertIn("UpdateProjectLedgerEntryUseCase", text)
        self.assertGreaterEqual(text.count("resolve_application_result("), 3)

    def test_read_create_update_ledger_routes_no_longer_import_moved_helpers(self) -> None:
        text = LEDGER_ROUTE_PATH.read_text(encoding="utf-8")

        forbidden_tokens = (
            "build_project_ledger_payloads",
            "create_project_ledger_entry_response",
            "build_project_ledger_create_values",
            "update_project_ledger_entry_response",
            "build_project_ledger_update_values",
            "ProjectValidationError",
            "raise_bad_request",
            "require_project_ledger_entry",
        )
        violations = [token for token in forbidden_tokens if token in text]

        self.assertEqual(violations, [])
