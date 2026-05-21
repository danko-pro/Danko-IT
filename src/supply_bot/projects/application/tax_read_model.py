from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

TAX_BASE_MODE_RECEIVED_TOTAL = "received_total"


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
    # DASH-FINANCE-4 keeps tax runtime separate from planned margin.
    # The real persisted tax rate requires a later schema/config step.
    return ProjectTaxRuntimeConfig(
        tax_rate_percent=0.0,
        tax_base_mode=TAX_BASE_MODE_RECEIVED_TOTAL,
    )


def resolve_project_tax_base(
    *,
    project: Mapping[str, Any],
    tax_base_mode: str,
) -> float:
    if tax_base_mode == TAX_BASE_MODE_RECEIVED_TOTAL:
        return _safe_amount(project.get("received_total"))
    return 0.0
