from __future__ import annotations

from supply_bot.application.errors import ValidationError

FLOORING_CATALOG_ASSEMBLY_TARGET_KINDS = frozenset({"covering", "preparation", "layout"})


def validate_flooring_catalog_assembly_target_kind(target_kind: str) -> str:
    normalized = (target_kind or "").strip()
    if normalized not in FLOORING_CATALOG_ASSEMBLY_TARGET_KINDS:
        raise ValidationError("Invalid flooring catalog assembly target_kind")
    return normalized
