from __future__ import annotations

import unittest
from pathlib import Path

from supply_bot.projects.application.tax_read_model import (
    TAX_BASE_MODE_RECEIVED_TOTAL,
    build_project_tax_runtime_config,
    resolve_project_tax_base,
)
from tests.test_projects_application_list_projects import _project_row

REPO_ROOT = Path(__file__).resolve().parents[1]
TAX_READ_MODEL_PATH = REPO_ROOT / "src" / "supply_bot" / "projects" / "application" / "tax_read_model.py"


class ProjectTaxReadModelTests(unittest.TestCase):
    def test_default_tax_config_uses_zero_rate_and_received_total_base(self) -> None:
        config = build_project_tax_runtime_config(_project_row())

        self.assertEqual(config.tax_rate_percent, 0.0)
        self.assertEqual(config.tax_base_mode, TAX_BASE_MODE_RECEIVED_TOTAL)

    def test_resolves_tax_base_from_received_total(self) -> None:
        tax_base = resolve_project_tax_base(
            project=_project_row(received_total=100000),
            tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL,
        )

        self.assertEqual(tax_base, 100000.0)

    def test_planned_margin_percent_is_ignored_for_tax_rate(self) -> None:
        config = build_project_tax_runtime_config(_project_row(planned_margin_percent=30))

        self.assertEqual(config.tax_rate_percent, 0.0)

    def test_invalid_or_missing_received_total_resolves_to_zero(self) -> None:
        self.assertEqual(
            resolve_project_tax_base(project=_project_row(received_total=None), tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL),
            0.0,
        )
        self.assertEqual(
            resolve_project_tax_base(project=_project_row(received_total=""), tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL),
            0.0,
        )
        self.assertEqual(
            resolve_project_tax_base(project=_project_row(received_total="abc"), tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL),
            0.0,
        )
        self.assertEqual(
            resolve_project_tax_base(project={}, tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL),
            0.0,
        )


class ProjectTaxReadModelArchitectureTests(unittest.TestCase):
    def test_tax_read_model_has_no_forbidden_dependencies(self) -> None:
        source = TAX_READ_MODEL_PATH.read_text(encoding="utf-8").lower()

        for forbidden in ("fastapi", "sqlalchemy", "storage", "admin_api"):
            self.assertNotIn(forbidden, source)


if __name__ == "__main__":
    unittest.main()
