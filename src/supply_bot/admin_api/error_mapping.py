from __future__ import annotations

from collections.abc import Awaitable
from typing import TypeVar

from fastapi import HTTPException

from supply_bot.application.errors import (
    ApplicationError,
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    OperationFailedError,
    ValidationError,
)

_T = TypeVar("_T")


def application_error_to_http_exception(exc: ApplicationError) -> HTTPException:
    status_code = _status_code_for_application_error(exc)
    return HTTPException(status_code=status_code, detail=str(exc))


def raise_application_http_error(exc: ApplicationError) -> None:
    raise application_error_to_http_exception(exc)


async def resolve_application_result(awaitable: Awaitable[_T]) -> _T:
    try:
        return await awaitable
    except ApplicationError as exc:
        raise application_error_to_http_exception(exc) from exc


def _status_code_for_application_error(exc: ApplicationError) -> int:
    if isinstance(exc, ValidationError):
        return 400
    if isinstance(exc, NotFoundError):
        return 404
    if isinstance(exc, ConflictError):
        return 409
    if isinstance(exc, ExternalServiceError):
        return 502
    if isinstance(exc, OperationFailedError):
        return 500
    return 400
