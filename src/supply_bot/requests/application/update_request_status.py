from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from supply_bot.application.errors import NotFoundError, OperationFailedError, ValidationError
from supply_bot.domain.request_lifecycle import (
    ADMIN_REQUEST_STATUSES,
    RequestLifecycleError,
    normalize_request_status,
)


class RequestStatusNotificationResult(Protocol):
    delivered: bool
    error: str | None


class RequestStatusNotificationService(Protocol):
    async def flush_pending(self, *, limit: int) -> object: ...

    async def enqueue_and_try_send(self, *, chat_id: int, text: str) -> RequestStatusNotificationResult: ...


class RequestStatusUpdateStorage(Protocol):
    async def get_draft(self, draft_id: int) -> dict[str, Any] | None: ...

    async def update_draft_admin_fields(
        self,
        draft_id: int,
        *,
        status: str,
        waiting_for: str | None,
    ) -> None: ...


@dataclass(frozen=True, slots=True)
class UpdateRequestStatusCommand:
    draft_id: int
    status: str


class UpdateRequestStatusUseCase:
    def __init__(
        self,
        storage: RequestStatusUpdateStorage,
        *,
        notifications: RequestStatusNotificationService | None = None,
        status_message_resolver: Callable[[str], str | None] | None = None,
    ) -> None:
        self.storage = storage
        self.notifications = notifications
        self.status_message_resolver = status_message_resolver

    async def execute(self, command: UpdateRequestStatusCommand) -> dict[str, Any]:
        draft = await self.storage.get_draft(command.draft_id)
        if not draft:
            raise NotFoundError("Draft not found")

        target_status = _normalize_admin_request_status(command.status)

        try:
            await self.storage.update_draft_admin_fields(
                command.draft_id,
                status=target_status,
                waiting_for="confirmation" if target_status == "confirmed" else None,
            )
        except RequestLifecycleError as exc:
            raise ValidationError(str(exc)) from exc

        updated_draft = await self.storage.get_draft(command.draft_id)
        if not updated_draft:
            raise OperationFailedError("Draft status update failed")

        notification_error: str | None = None
        notified = False
        notification_text = self.status_message_resolver(target_status) if self.status_message_resolver else None
        if notification_text and self.notifications:
            await self.notifications.flush_pending(limit=10)
            result = await self.notifications.enqueue_and_try_send(
                chat_id=int(updated_draft["chat_id"]),
                text=notification_text,
            )
            notified = result.delivered
            notification_error = result.error

        return {
            "draft_id": command.draft_id,
            "status": target_status,
            "notified": notified,
            "notification_error": notification_error,
        }


def _normalize_admin_request_status(value: str) -> str:
    try:
        return normalize_request_status(value, allowed=ADMIN_REQUEST_STATUSES)
    except RequestLifecycleError as exc:
        raise ValidationError("Unsupported status") from exc
