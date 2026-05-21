from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from supply_bot.projects.domain.common import (
    ALLOWED_PROJECT_TAX_BASE_MODES,
    DEFAULT_PROJECT_TAX_BASE_MODE,
)

TAX_BASE_MODE_RECEIVED_TOTAL = DEFAULT_PROJECT_TAX_BASE_MODE


@dataclass(frozen=True)
class ProjectTaxRuntimeConfig:
    tax_rate_percent: float
    tax_base_mode: str


def _safe_amount(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return 0.0
    if amount < 0:
        return 0.0
    return amount


def build_project_tax_runtime_config(project: Mapping[str, Any]) -> ProjectTaxRuntimeConfig:
    # planned_margin_percent is a margin field, not a tax setting.
    tax_base_mode = str(project.get("tax_base_mode") or DEFAULT_PROJECT_TAX_BASE_MODE).strip().lower()
    if tax_base_mode not in ALLOWED_PROJECT_TAX_BASE_MODES:
        tax_base_mode = DEFAULT_PROJECT_TAX_BASE_MODE
    return ProjectTaxRuntimeConfig(
        tax_rate_percent=_safe_amount(project.get("tax_rate_percent")),
        tax_base_mode=tax_base_mode,
    )


def resolve_project_tax_base(
    *,
    project: Mapping[str, Any],
    tax_base_mode: str,
) -> float:
    if tax_base_mode == TAX_BASE_MODE_RECEIVED_TOTAL:
        return _safe_amount(project.get("received_total"))
    return 0.0
