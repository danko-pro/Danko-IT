from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "app_routes_requests.py"
WRAPPERS_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "use_cases" / "requests.py"


class RequestsRoutesErrorMappingBoundaryTests(unittest.TestCase):
    def test_migrated_request_routes_use_application_error_mapper(self) -> None:
        text = ROUTES_PATH.read_text(encoding="utf-8")

        self.assertIn("resolve_application_result", text)
        self.assertGreaterEqual(text.count("resolve_application_result("), 9)
        self.assertNotIn("except ValueError", text)
        self.assertNotIn("raise HTTPException", text)

    def test_requests_compatibility_wrappers_do_not_use_http_exception(self) -> None:
        text = WRAPPERS_PATH.read_text(encoding="utf-8")

        self.assertIn("raise_application_http_error", text)
        self.assertNotIn("from fastapi", text)
        self.assertNotIn("HTTPException", text)
        self.assertNotIn("raise ValueError", text)
        self.assertNotIn("build_request_item_create_values", text)
        self.assertNotIn("build_request_item_update_values", text)
        self.assertNotIn("normalize_request_delivery", text)
