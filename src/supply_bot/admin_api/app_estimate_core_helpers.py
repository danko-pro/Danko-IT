"""Compatibility facade for calculator core payload helpers."""

from supply_bot.admin_api.calculator_payloads.core import (
    _estimate_project_payload,
    _estimate_room_detail,
    _estimate_room_summary,
)
from supply_bot.estimates.domain.room_geometry import estimate_opening_area, estimate_room_stats

_estimate_opening_area = estimate_opening_area
_estimate_room_stats = estimate_room_stats

__all__ = [
    "_estimate_opening_area",
    "_estimate_project_payload",
    "_estimate_room_detail",
    "_estimate_room_stats",
    "_estimate_room_summary",
]
