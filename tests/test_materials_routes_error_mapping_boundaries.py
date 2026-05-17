from __future__ import annotations

import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "app_routes_materials.py"
WRAPPERS_PATH = REPO_ROOT / "src" / "supply_bot" / "admin_api" / "use_cases" / "materials.py"


class MaterialsRoutesErrorMappingBoundaryTests(unittest.TestCase):
    def test_material_routes_use_application_error_mapper(self) -> None:
        text = ROUTES_PATH.read_text(encoding="utf-8")

        self.assertIn("resolve_application_result", text)
        self.assertGreaterEqual(text.count("resolve_application_result("), 7)
        self.assertNotIn("except ValueError", text)
        self.assertNotIn("raise HTTPException", text)
        self.assertNotIn("supply_bot.admin_api.use_cases.materials", text)

    def test_materials_compatibility_wrappers_do_not_duplicate_business_validation(self) -> None:
        text = WRAPPERS_PATH.read_text(encoding="utf-8")

        self.assertIn("raise_application_http_error", text)
        self.assertNotIn("from fastapi", text)
        self.assertNotIn("HTTPException", text)
        self.assertNotIn("validate_material_", text)
        self.assertNotIn("require_material_", text)
        self.assertNotIn("split_material_alias_values", text)
