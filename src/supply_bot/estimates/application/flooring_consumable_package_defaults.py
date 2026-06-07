from __future__ import annotations

from supply_bot.utils import normalize_text

# Standard retail pack sizes for covering consumables (PF5c5/PF5c6).
FLOORING_CONSUMABLE_PACKAGE_DEFAULTS: dict[str, tuple[str, float]] = {
    "клей": ("package_consumption", 25.0),
    "грунт": ("package_consumption", 10.0),
    "свп": ("piece_consumption", 500.0),
    "затирка": ("package_consumption", 5.0),
}


def consumable_package_defaults_for_title(title: str) -> tuple[str, float] | None:
    normalized = normalize_text(title)
    for key, value in FLOORING_CONSUMABLE_PACKAGE_DEFAULTS.items():
        if key in normalized:
            return value
    return None
