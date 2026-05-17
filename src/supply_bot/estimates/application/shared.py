from __future__ import annotations

from supply_bot.application.errors import ValidationError


def normalize_required_text(value: str | None, *, error_message: str) -> str:
    normalized = (value or "").strip()
    if not normalized:
        raise ValidationError(error_message)
    return normalized


def normalize_optional_text(value: str | None) -> str | None:
    normalized = (value or "").strip()
    return normalized or None


def clamp_minimum(value: float | int, minimum: float) -> float:
    return max(float(value), minimum)


def clamp_non_negative(value: float | int) -> float:
    return max(float(value), 0.0)


def clamp_optional_non_negative(value: float | int | None) -> float | None:
    if value is None:
        return None
    return clamp_non_negative(value)


def clamp_factor(value: object) -> float:
    if value in (None, ""):
        return 1.0
    return clamp_non_negative(float(value))


def optional_non_negative(value: object) -> float | None:
    if value in (None, ""):
        return None
    return clamp_non_negative(float(value))


def require_positive_number(value: float | int | None, *, error_message: str) -> float:
    if value is None:
        raise ValidationError(error_message)
    normalized = float(value)
    if normalized <= 0:
        raise ValidationError(error_message)
    return normalized


def normalize_room_name_or_fallback(value: str | None, *, fallback_index: int) -> str:
    normalized = (value or "").strip()
    return normalized or f"Помещение {fallback_index}"
