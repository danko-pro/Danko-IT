"""Общие adapters и transport-helper'ы для project routes.

Маршруты не должны вручную дублировать:
- try/except для доменных ошибок;
- чтение storage/settings из request;
- извлечение PATCH-payload через model_dump(exclude_unset=True).
"""

from __future__ import annotations

from typing import Any, Awaitable, TypeVar

from fastapi import HTTPException, Request

from supply_bot.admin_api.deps import get_settings, get_storage
from supply_bot.config import Settings
from supply_bot.projects.orchestration import ProjectLookupError, ProjectOperationError
from supply_bot.storage import BotStorage

_T = TypeVar("_T")


# Базовые преобразователи ошибок.
def raise_bad_request(exc: ValueError) -> None:
    raise HTTPException(status_code=400, detail=str(exc)) from exc


def raise_not_found(exc: LookupError) -> None:
    raise HTTPException(status_code=404, detail=str(exc)) from exc


def raise_server_error(exc: RuntimeError) -> None:
    raise HTTPException(status_code=500, detail=str(exc)) from exc


# Общие transport-helper'ы для request context и PATCH-маршрутов.
def get_project_route_storage(request: Request) -> BotStorage:
    return get_storage(request)


def get_project_route_settings(request: Request) -> Settings:
    return get_settings(request)


def extract_patch_payload(payload: Any) -> dict[str, Any]:
    return dict(payload.model_dump(exclude_unset=True))


# Awaitable-обёртки для route-слоя.
async def resolve_or_not_found(awaitable: Awaitable[_T]) -> _T:
    try:
        return await awaitable
    except ProjectLookupError as exc:
        raise_not_found(exc)


async def resolve_or_server_error(awaitable: Awaitable[_T]) -> _T:
    try:
        return await awaitable
    except ProjectOperationError as exc:
        raise_server_error(exc)


async def resolve_or_http_error(awaitable: Awaitable[_T]) -> _T:
    try:
        return await awaitable
    except ProjectLookupError as exc:
        raise_not_found(exc)
    except ProjectOperationError as exc:
        raise_server_error(exc)
