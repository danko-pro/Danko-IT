"""Generic CRUD route handlers for calculator routes.

Provides reusable handlers for common patterns:
- create: Execute use case, resolve errors, load response
- get: Execute use case, resolve errors, return response
- update: Execute use case, resolve errors, load response
- delete: Execute use case, resolve errors
- list: Execute use case, resolve errors, return response

These handlers eliminate duplication across flooring, wall_finish, doors, etc.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, TypeVar

from fastapi import Request

from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.storage import BotStorage

CommandType = TypeVar("CommandType")
ResultType = TypeVar("ResultType")


async def handle_create_and_load(
    request: Request,
    payload: Any,
    command_builder: Callable[[Any], CommandType],
    use_case_class: type,
    storage_getter: Callable[[Request], BotStorage | Any],
    response_loader: Callable[[Any, int], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    """Generic create handler: build command, execute use case, load response.

    Args:
        request: FastAPI Request
        payload: Request body payload
        command_builder: Function to build command from payload
        use_case_class: Use case class (e.g., CreateEstimateProjectUseCase)
        storage_getter: Function to get storage from request
        response_loader: Async function to load response given storage and created_id

    Returns:
        Loaded response (e.g., created project/item details)
    """
    storage = storage_getter(request)
    command = command_builder(payload)
    created_id = await resolve_application_result(use_case_class(storage).execute(command))
    return await response_loader(storage, created_id)


async def handle_get(
    request: Request,
    item_id: int,
    use_case_class: type,
    storage_getter: Callable[[Request], BotStorage | Any],
    command_builder: Callable[[int], CommandType],
) -> dict[str, Any]:
    """Generic get handler: execute use case, resolve errors, return response.

    Args:
        request: FastAPI Request
        item_id: ID of item to get
        use_case_class: Use case class (e.g., GetEstimateProjectUseCase)
        storage_getter: Function to get storage from request
        command_builder: Function to build command from item_id

    Returns:
        Item details
    """
    storage = storage_getter(request)
    command = command_builder(item_id)
    return await resolve_application_result(use_case_class(storage).execute(command))


async def handle_update_and_load(
    request: Request,
    item_id: int,
    payload: Any,
    command_builder: Callable[[int, Any], CommandType],
    use_case_class: type,
    storage_getter: Callable[[Request], BotStorage | Any],
    response_loader: Callable[[Any, int], Awaitable[dict[str, Any]]],
) -> dict[str, Any]:
    """Generic update handler: build command, execute use case, load response.

    Args:
        request: FastAPI Request
        item_id: ID of item to update
        payload: Request body payload
        command_builder: Function to build command from item_id and payload
        use_case_class: Use case class (e.g., UpdateEstimateProjectUseCase)
        storage_getter: Function to get storage from request
        response_loader: Async function to load response given storage and item_id

    Returns:
        Updated item details
    """
    storage = storage_getter(request)
    command = command_builder(item_id, payload)
    await resolve_application_result(use_case_class(storage).execute(command))
    return await response_loader(storage, item_id)


async def handle_delete(
    request: Request,
    item_id: int,
    use_case_class: type,
    storage_getter: Callable[[Request], BotStorage | Any],
    command_builder: Callable[[int], CommandType],
) -> None:
    """Generic delete handler: execute use case, resolve errors, return None.

    Args:
        request: FastAPI Request
        item_id: ID of item to delete
        use_case_class: Use case class
        storage_getter: Function to get storage from request
        command_builder: Function to build command from item_id

    Returns:
        None (204 No Content response)
    """
    storage = storage_getter(request)
    command = command_builder(item_id)
    await resolve_application_result(use_case_class(storage).execute(command))


async def handle_list(
    request: Request,
    use_case_class: type,
    storage_getter: Callable[[Request], BotStorage | Any],
) -> list[dict[str, Any]]:
    """Generic list handler: execute use case, resolve errors, return list.

    Args:
        request: FastAPI Request
        use_case_class: Use case class (must accept storage and have execute())
        storage_getter: Function to get storage from request

    Returns:
        List of items
    """
    storage = storage_getter(request)
    return await resolve_application_result(use_case_class(storage).execute())
