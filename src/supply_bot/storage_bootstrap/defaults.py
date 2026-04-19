from __future__ import annotations

from supply_bot.storage_bootstrap.defaults_flooring import (
    FLOORING_COVERING_DEFAULTS,
    FLOORING_LAYOUT_DEFAULTS,
    FLOORING_PREPARATION_DEFAULTS,
)
from supply_bot.storage_bootstrap.defaults_wall_finish import (
    WALL_FINISH_COVERING_DEFAULTS,
    WALL_FINISH_LAYOUT_DEFAULTS,
    WALL_FINISH_PREPARATION_DEFAULTS,
)

# Совместимый фасад для seed-данных bootstrap-слоя.

__all__ = [
    "FLOORING_COVERING_DEFAULTS",
    "FLOORING_LAYOUT_DEFAULTS",
    "FLOORING_PREPARATION_DEFAULTS",
    "WALL_FINISH_COVERING_DEFAULTS",
    "WALL_FINISH_LAYOUT_DEFAULTS",
    "WALL_FINISH_PREPARATION_DEFAULTS",
]
