"""Общие доменные константы и нормализаторы для раздела проектов.

Модуль содержит базовые правила, которые переиспользуются
в project/ledger/contract сценариях:
- значения по умолчанию;
- допустимые статусы;
- общие нормализаторы текста, дат и чисел.
"""

from __future__ import annotations

from datetime import date

DEFAULT_PROJECT_NAME = "Новый объект"
DEFAULT_PROJECT_STAGE_LABEL = "Черновик"
DEFAULT_PROJECT_STAGE_TONE = "neutral"
DEFAULT_PROJECT_ESTIMATE_SOURCE = "Смета калькулятора + ручной учет"
ALLOWED_PROJECT_STAGE_TONES = {"ok", "warn", "neutral", "active", "error"}
ALLOWED_PROJECT_ADVANCE_STATUSES = {"paid", "planned"}
ALLOWED_PROJECT_LEDGER_STATUSES = {"planned", "invoice", "waiting-payment", "paid", "completed"}
ALLOWED_PROJECT_CONTRACT_EXTRACTION_STATUSES = {"review", "verified"}
ALLOWED_PROJECT_CONTRACT_MILESTONE_KINDS = {"invoice", "payment", "deadline"}
ALLOWED_PROJECT_CONTRACT_MILESTONE_STATUSES = {"upcoming", "due", "completed"}


# Базовая ошибка валидации для доменного слоя проектов.
class ProjectValidationError(ValueError):
    pass


# Универсальные helpers для полей, которые встречаются в нескольких сущностях.
def build_default_project_code(sequence: int) -> str:
    safe_sequence = max(1, sequence)
    return f"НОВ / {safe_sequence:02d}"


def normalize_project_name(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or DEFAULT_PROJECT_NAME


def normalize_project_stage_label(value: str | None) -> str:
    normalized = (value or "").strip()
    return normalized or DEFAULT_PROJECT_STAGE_LABEL


def normalize_project_stage_tone(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in ALLOWED_PROJECT_STAGE_TONES:
        return normalized
    return DEFAULT_PROJECT_STAGE_TONE


def normalize_project_text(value: str | None, *, default: str = "") -> str:
    normalized = (value or "").strip()
    return normalized or default


def validate_project_metric(value: float | None, *, field: str, allow_none: bool = False) -> float | None:
    if value is None:
        if allow_none:
            return None
        raise ProjectValidationError(f"{field} is required")
    if value < 0:
        raise ProjectValidationError(f"{field} cannot be negative")
    return float(value)


def validate_project_count(value: int | float | None, *, field: str, allow_none: bool = False) -> int | None:
    if value is None:
        if allow_none:
            return None
        raise ProjectValidationError(f"{field} is required")
    if value < 0:
        raise ProjectValidationError(f"{field} cannot be negative")
    if int(value) != value:
        raise ProjectValidationError(f"{field} must be a whole number")
    return int(value)


def normalize_project_date(value: str | None, *, field: str, required: bool = False) -> str:
    normalized = normalize_project_text(value)
    if not normalized:
        if required:
            raise ProjectValidationError(f"{field} is required")
        return ""
    try:
        return date.fromisoformat(normalized).isoformat()
    except ValueError as exc:
        raise ProjectValidationError(f"{field} must be in YYYY-MM-DD format") from exc


def default_project_contract_milestone_status(planned_date: str) -> str:
    try:
        return "due" if date.fromisoformat(planned_date) <= date.today() else "upcoming"
    except ValueError:
        return "upcoming"


def document_title_for_kind(kind: str) -> str:
    return "Счёт" if kind == "invoice" else "Акт"
