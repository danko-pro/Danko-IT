from __future__ import annotations

REQUEST_STATUS_COLLECTING = "collecting"
REQUEST_STATUS_AWAITING_CONFIRMATION = "awaiting_confirmation"
REQUEST_STATUS_CONFIRMED = "confirmed"
REQUEST_STATUS_IN_PROGRESS = "in_progress"
REQUEST_STATUS_DONE = "done"
REQUEST_STATUS_CANCELLED = "cancelled"

REQUEST_STATUSES = {
    REQUEST_STATUS_COLLECTING,
    REQUEST_STATUS_AWAITING_CONFIRMATION,
    REQUEST_STATUS_CONFIRMED,
    REQUEST_STATUS_IN_PROGRESS,
    REQUEST_STATUS_DONE,
    REQUEST_STATUS_CANCELLED,
}

ADMIN_REQUEST_STATUSES = {
    REQUEST_STATUS_COLLECTING,
    REQUEST_STATUS_CONFIRMED,
    REQUEST_STATUS_IN_PROGRESS,
    REQUEST_STATUS_DONE,
    REQUEST_STATUS_CANCELLED,
}

ACTIVE_REQUEST_STATUSES = {
    REQUEST_STATUS_COLLECTING,
    REQUEST_STATUS_AWAITING_CONFIRMATION,
}

DELETABLE_REQUEST_STATUSES = {
    REQUEST_STATUS_COLLECTING,
    REQUEST_STATUS_AWAITING_CONFIRMATION,
    REQUEST_STATUS_CANCELLED,
}

REQUEST_STATUS_TRANSITIONS = {
    REQUEST_STATUS_COLLECTING: {
        REQUEST_STATUS_COLLECTING,
        REQUEST_STATUS_AWAITING_CONFIRMATION,
        REQUEST_STATUS_CONFIRMED,
        REQUEST_STATUS_CANCELLED,
    },
    REQUEST_STATUS_AWAITING_CONFIRMATION: {
        REQUEST_STATUS_AWAITING_CONFIRMATION,
        REQUEST_STATUS_COLLECTING,
        REQUEST_STATUS_CONFIRMED,
        REQUEST_STATUS_CANCELLED,
    },
    REQUEST_STATUS_CONFIRMED: {
        REQUEST_STATUS_CONFIRMED,
        REQUEST_STATUS_IN_PROGRESS,
        REQUEST_STATUS_DONE,
        REQUEST_STATUS_CANCELLED,
        REQUEST_STATUS_COLLECTING,
    },
    REQUEST_STATUS_IN_PROGRESS: {
        REQUEST_STATUS_IN_PROGRESS,
        REQUEST_STATUS_DONE,
        REQUEST_STATUS_CANCELLED,
        REQUEST_STATUS_COLLECTING,
    },
    REQUEST_STATUS_DONE: {
        REQUEST_STATUS_DONE,
        REQUEST_STATUS_IN_PROGRESS,
        REQUEST_STATUS_CANCELLED,
        REQUEST_STATUS_COLLECTING,
    },
    REQUEST_STATUS_CANCELLED: {
        REQUEST_STATUS_CANCELLED,
        REQUEST_STATUS_COLLECTING,
    },
}


class RequestLifecycleError(ValueError):
    pass


def normalize_request_status(value: str | None, *, allowed: set[str] | None = None) -> str:
    normalized = (value or "").strip().lower()
    allowed_statuses = allowed or REQUEST_STATUSES
    if normalized not in allowed_statuses:
        raise RequestLifecycleError(f"Unsupported request status: {value}")
    return normalized


def validate_request_status_transition(current_status: str | None, target_status: str) -> str:
    target = normalize_request_status(target_status)
    if current_status is None:
        return target

    current = normalize_request_status(current_status)
    allowed_targets = REQUEST_STATUS_TRANSITIONS[current]
    if target not in allowed_targets:
        raise RequestLifecycleError(f"Request status transition is not allowed: {current} -> {target}")
    return target


def can_delete_request_status(status: str | None) -> bool:
    try:
        return normalize_request_status(status) in DELETABLE_REQUEST_STATUSES
    except RequestLifecycleError:
        return False


def is_active_request_status(status: str | None) -> bool:
    try:
        return normalize_request_status(status) in ACTIVE_REQUEST_STATUSES
    except RequestLifecycleError:
        return False
