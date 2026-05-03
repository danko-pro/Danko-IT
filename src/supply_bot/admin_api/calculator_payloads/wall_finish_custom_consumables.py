from __future__ import annotations

from typing import Any

from supply_bot.admin_api.calculator_payloads.flooring_custom_consumables import (
    custom_consumables_to_json,
    parse_flooring_custom_consumables,
)


def parse_wall_finish_custom_consumables(covering: dict[str, Any] | None) -> list[dict[str, Any]]:
    return parse_flooring_custom_consumables(covering)


__all__ = ["custom_consumables_to_json", "parse_wall_finish_custom_consumables"]
