from __future__ import annotations

import unittest

from fastapi import HTTPException

from supply_bot.admin_api.error_mapping import (
    application_error_to_http_exception,
    raise_application_http_error,
    resolve_application_result,
)
from supply_bot.application.errors import (
    ApplicationError,
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    OperationFailedError,
    ValidationError,
)


class AdminApiErrorMappingTests(unittest.IsolatedAsyncioTestCase):
    def test_mapper_returns_expected_http_status_codes(self) -> None:
        cases = [
            (ValidationError("Name is required"), 400),
            (NotFoundError("Project not found"), 404),
            (ConflictError("Already exists"), 409),
            (ExternalServiceError("Telegram unavailable"), 502),
            (OperationFailedError("Project update failed"), 500),
            (ApplicationError("Generic application error"), 400),
        ]

        for exc, expected_status in cases:
            with self.subTest(exc=type(exc).__name__):
                http_exc = application_error_to_http_exception(exc)
                self.assertIsInstance(http_exc, HTTPException)
                self.assertEqual(http_exc.status_code, expected_status)
                self.assertEqual(http_exc.detail, str(exc))

    def test_mapper_keeps_string_detail_when_code_and_payload_are_present(self) -> None:
        exc = ValidationError("Name is required", code="name_required", payload={"field": "name"})

        http_exc = application_error_to_http_exception(exc)

        self.assertEqual(http_exc.status_code, 400)
        self.assertEqual(http_exc.detail, "Name is required")

    def test_raise_application_http_error_raises_mapped_exception(self) -> None:
        with self.assertRaises(HTTPException) as context:
            raise_application_http_error(NotFoundError("Project not found"))

        self.assertEqual(context.exception.status_code, 404)
        self.assertEqual(context.exception.detail, "Project not found")

    async def test_resolve_application_result_returns_successful_result(self) -> None:
        async def successful_operation() -> str:
            return "ok"

        result = await resolve_application_result(successful_operation())

        self.assertEqual(result, "ok")

    async def test_resolve_application_result_maps_application_error(self) -> None:
        async def failing_operation() -> str:
            raise ConflictError("Already exists")

        with self.assertRaises(HTTPException) as context:
            await resolve_application_result(failing_operation())

        self.assertEqual(context.exception.status_code, 409)
        self.assertEqual(context.exception.detail, "Already exists")
