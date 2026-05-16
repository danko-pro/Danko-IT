from __future__ import annotations

import unittest
from pathlib import Path

from supply_bot.application.errors import (
    ApplicationError,
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    OperationFailedError,
    ValidationError,
)


class ApplicationErrorTests(unittest.TestCase):
    def test_application_errors_do_not_import_runtime_adapter_dependencies(self) -> None:
        source_path = Path(__file__).resolve().parents[1] / "src" / "supply_bot" / "application" / "errors.py"
        source = source_path.read_text(encoding="utf-8")

        forbidden_tokens = ("fastapi", "HTTPException", "Request", "Response", "sqlalchemy")
        for token in forbidden_tokens:
            with self.subTest(token=token):
                self.assertNotIn(token, source)

    def test_application_error_preserves_message_code_payload_and_detail(self) -> None:
        payload = {"field": "name"}

        exc = ApplicationError("Name is required", code="name_required", payload=payload)

        self.assertEqual(str(exc), "Name is required")
        self.assertEqual(exc.message, "Name is required")
        self.assertEqual(exc.detail, "Name is required")
        self.assertEqual(exc.code, "name_required")
        self.assertEqual(exc.payload, {"field": "name"})
        self.assertIsNot(exc.payload, payload)

    def test_error_subclasses_are_application_errors(self) -> None:
        errors = [
            ValidationError("Name is required"),
            NotFoundError("Project not found"),
            ConflictError("Already exists"),
            ExternalServiceError("Telegram unavailable"),
            OperationFailedError("Project update failed"),
        ]

        for exc in errors:
            with self.subTest(exc=type(exc).__name__):
                self.assertIsInstance(exc, ApplicationError)
                self.assertEqual(str(exc), exc.message)
