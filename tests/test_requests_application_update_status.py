from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import pytest

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.domain.request_lifecycle import RequestLifecycleError
from supply_bot.requests.application.update_request_status import (
    UpdateRequestStatusCommand,
    UpdateRequestStatusUseCase,
)


@dataclass(frozen=True, slots=True)
class FakeNotificationResult:
    delivered: bool
    error: str | None = None


class FakeRequestStatusStorage:
    def __init__(
        self,
        *,
        draft: dict[str, Any] | None,
        updated_draft_missing: bool = False,
        lifecycle_error: str | None = None,
    ) -> None:
        self.draft = draft
        self.updated_draft_missing = updated_draft_missing
        self.lifecycle_error = lifecycle_error
        self.update_calls: list[dict[str, Any]] = []
        self.get_calls = 0

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        self.get_calls += 1
        if not self.draft or int(self.draft["id"]) != draft_id:
            return None
        if self.updated_draft_missing and self.get_calls > 1:
            return None
        return self.draft

    async def update_draft_admin_fields(
        self,
        draft_id: int,
        *,
        status: str,
        waiting_for: str | None,
    ) -> None:
        self.update_calls.append(
            {
                "draft_id": draft_id,
                "status": status,
                "waiting_for": waiting_for,
            }
        )
        if self.lifecycle_error:
            raise RequestLifecycleError(self.lifecycle_error)


class FakeNotifications:
    def __init__(self, *, delivered: bool = True, error: str | None = None) -> None:
        self.delivered = delivered
        self.error = error
        self.flush_limits: list[int] = []
        self.sent_messages: list[dict[str, Any]] = []

    async def flush_pending(self, *, limit: int) -> object:
        self.flush_limits.append(limit)
        return object()

    async def enqueue_and_try_send(self, *, chat_id: int, text: str) -> FakeNotificationResult:
        self.sent_messages.append({"chat_id": chat_id, "text": text})
        return FakeNotificationResult(delivered=self.delivered, error=self.error)


def test_update_request_status_updates_status_and_sends_notification() -> None:
    storage = FakeRequestStatusStorage(draft={"id": 7, "chat_id": 1001, "status": "collecting"})
    notifications = FakeNotifications(delivered=True)
    command = UpdateRequestStatusCommand(draft_id=7, status=" confirmed ")

    result = asyncio.run(
        UpdateRequestStatusUseCase(
            storage,
            notifications=notifications,
            status_message_resolver=lambda status: f"message:{status}",
        ).execute(command)
    )

    assert storage.update_calls == [
        {
            "draft_id": 7,
            "status": "confirmed",
            "waiting_for": "confirmation",
        }
    ]
    assert notifications.flush_limits == [10]
    assert notifications.sent_messages == [{"chat_id": 1001, "text": "message:confirmed"}]
    assert result == {
        "draft_id": 7,
        "status": "confirmed",
        "notified": True,
        "notification_error": None,
    }


def test_update_request_status_without_notification_message_returns_not_notified() -> None:
    storage = FakeRequestStatusStorage(draft={"id": 7, "chat_id": 1001, "status": "collecting"})
    notifications = FakeNotifications()
    command = UpdateRequestStatusCommand(draft_id=7, status="in_progress")

    result = asyncio.run(
        UpdateRequestStatusUseCase(
            storage,
            notifications=notifications,
            status_message_resolver=lambda _status: None,
        ).execute(command)
    )

    assert notifications.flush_limits == []
    assert notifications.sent_messages == []
    assert result == {
        "draft_id": 7,
        "status": "in_progress",
        "notified": False,
        "notification_error": None,
    }


def test_update_request_status_raises_not_found_for_missing_draft() -> None:
    storage = FakeRequestStatusStorage(draft=None)
    command = UpdateRequestStatusCommand(draft_id=404, status="confirmed")

    with pytest.raises(NotFoundError, match="Draft not found"):
        asyncio.run(UpdateRequestStatusUseCase(storage).execute(command))

    assert storage.update_calls == []


def test_update_request_status_rejects_unknown_status() -> None:
    storage = FakeRequestStatusStorage(draft={"id": 7, "chat_id": 1001, "status": "collecting"})
    command = UpdateRequestStatusCommand(draft_id=7, status="unknown")

    with pytest.raises(ValidationError, match="Unsupported status"):
        asyncio.run(UpdateRequestStatusUseCase(storage).execute(command))

    assert storage.update_calls == []


def test_update_request_status_converts_lifecycle_error_to_validation_error() -> None:
    storage = FakeRequestStatusStorage(
        draft={"id": 7, "chat_id": 1001, "status": "done"},
        lifecycle_error="Request status transition is not allowed: done -> confirmed",
    )
    command = UpdateRequestStatusCommand(draft_id=7, status="confirmed")

    with pytest.raises(ValidationError, match="transition is not allowed"):
        asyncio.run(UpdateRequestStatusUseCase(storage).execute(command))


def test_update_request_status_raises_operation_failed_when_updated_draft_missing() -> None:
    storage = FakeRequestStatusStorage(
        draft={"id": 7, "chat_id": 1001, "status": "collecting"},
        updated_draft_missing=True,
    )
    command = UpdateRequestStatusCommand(draft_id=7, status="confirmed")

    with pytest.raises(OperationFailedError, match="Draft status update failed"):
        asyncio.run(UpdateRequestStatusUseCase(storage).execute(command))
