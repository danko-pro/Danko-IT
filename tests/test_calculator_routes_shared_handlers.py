"""Tests for calculator_routes/shared_handlers.py"""

from __future__ import annotations

import unittest
from dataclasses import dataclass
from typing import Any
from unittest.mock import MagicMock

from fastapi import HTTPException

from supply_bot.admin_api.calculator_routes.shared_handlers import (
    handle_create_and_load,
    handle_delete,
    handle_get,
    handle_list,
    handle_update_and_load,
)
from supply_bot.application.errors import ValidationError


# Fake classes for testing
@dataclass(frozen=True)
class FakeCommand:
    item_id: int | None = None
    name: str | None = None


class FakeUseCase:
    def __init__(self, storage: Any, raise_error: Exception | None = None):
        self.storage = storage
        self.raise_error = raise_error

    async def execute(self, command: FakeCommand | None = None) -> Any:
        if self.raise_error:
            raise self.raise_error
        return 42  # Simulated created_id or result


class FakeStorage:
    async def get_item(self, item_id: int) -> dict[str, Any]:
        return {"id": item_id, "name": f"Item {item_id}"}

    async def list_items(self) -> list[dict[str, Any]]:
        return [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]


class CalculatorRoutesSharedHandlersTests(unittest.IsolatedAsyncioTestCase):
    async def test_handle_create_and_load_success(self):
        """Test successful creation: command → use case → load response."""
        request = MagicMock()
        request.app.state.storage = FakeStorage()

        payload = {"name": "Test Item"}
        created_item = {"id": 42, "name": "Created Item"}

        def command_builder(p: dict) -> FakeCommand:
            return FakeCommand(name=p["name"])

        async def response_loader(storage: FakeStorage, item_id: int) -> dict[str, Any]:
            return created_item

        result = await handle_create_and_load(
            request,
            payload,
            command_builder,
            FakeUseCase,
            lambda r: FakeStorage(),
            response_loader,
        )

        self.assertEqual(result, created_item)

    async def test_handle_create_and_load_with_validation_error(self):
        """Test creation with ValidationError: should raise HTTPException."""

        class FailingUseCase:
            def __init__(self, storage: Any):
                self.storage = storage

            async def execute(self, command: FakeCommand) -> Any:
                raise ValidationError("Invalid input", code="invalid")

        request = MagicMock()
        payload = {"name": ""}

        def command_builder(p: dict) -> FakeCommand:
            return FakeCommand(name=p.get("name"))

        async def response_loader(storage: Any, item_id: int) -> dict[str, Any]:
            return {"id": item_id}

        with self.assertRaises(HTTPException) as ctx:
            await handle_create_and_load(
                request,
                payload,
                command_builder,
                FailingUseCase,
                lambda r: FakeStorage(),
                response_loader,
            )

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_handle_get_success(self):
        """Test get: execute use case, resolve errors, return response."""
        request = MagicMock()

        def command_builder(item_id: int) -> FakeCommand:
            return FakeCommand(item_id=item_id)

        result = await handle_get(
            request,
            item_id=42,
            use_case_class=FakeUseCase,
            storage_getter=lambda r: FakeStorage(),
            command_builder=command_builder,
        )

        self.assertEqual(result, 42)

    async def test_handle_update_and_load_success(self):
        """Test update: build command, execute, load response."""
        request = MagicMock()
        payload = {"name": "Updated Name"}
        updated_item = {"id": 42, "name": "Updated Name"}

        def command_builder(item_id: int, p: dict) -> FakeCommand:
            return FakeCommand(item_id=item_id, name=p["name"])

        async def response_loader(storage: FakeStorage, item_id: int) -> dict[str, Any]:
            return updated_item

        result = await handle_update_and_load(
            request,
            item_id=42,
            payload=payload,
            command_builder=command_builder,
            use_case_class=FakeUseCase,
            storage_getter=lambda r: FakeStorage(),
            response_loader=response_loader,
        )

        self.assertEqual(result, updated_item)

    async def test_handle_delete_success(self):
        """Test delete: execute use case, resolve errors, return None."""
        request = MagicMock()

        def command_builder(item_id: int) -> FakeCommand:
            return FakeCommand(item_id=item_id)

        result = await handle_delete(
            request,
            item_id=42,
            use_case_class=FakeUseCase,
            storage_getter=lambda r: FakeStorage(),
            command_builder=command_builder,
        )

        self.assertIsNone(result)

    async def test_handle_list_success(self):
        """Test list: execute use case, resolve errors, return list."""

        class ListUseCase:
            def __init__(self, storage: Any):
                self.storage = storage

            async def execute(self) -> list[dict[str, Any]]:
                return [{"id": 1}, {"id": 2}]

        request = MagicMock()

        result = await handle_list(
            request,
            use_case_class=ListUseCase,
            storage_getter=lambda r: FakeStorage(),
        )

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["id"], 1)
        self.assertEqual(result[1]["id"], 2)

    async def test_handle_list_with_error(self):
        """Test list with error: should convert to HTTPException."""

        class FailingListUseCase:
            def __init__(self, storage: Any):
                self.storage = storage

            async def execute(self) -> list[dict[str, Any]]:
                raise ValidationError("List failed", code="list_error")

        request = MagicMock()

        with self.assertRaises(HTTPException) as ctx:
            await handle_list(
                request,
                use_case_class=FailingListUseCase,
                storage_getter=lambda r: FakeStorage(),
            )

        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
