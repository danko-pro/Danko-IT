from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import httpx

from supply_bot.config import Settings
from supply_bot.domain.notifications import (
    TELEGRAM_NOTIFICATION_PENDING,
    TELEGRAM_NOTIFICATION_SENT,
    TelegramNotification,
)
from supply_bot.storage import BotStorage


class TelegramMessageSender(Protocol):
    async def send_message(self, *, chat_id: int, text: str) -> None:
        ...


@dataclass(frozen=True, slots=True)
class NotificationDeliveryResult:
    notification_id: int
    delivered: bool
    error: str | None = None


@dataclass(frozen=True, slots=True)
class NotificationFlushResult:
    delivered_count: int
    failed_count: int


class TelegramHttpMessageSender:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def send_message(self, *, chat_id: int, text: str) -> None:
        timeout = httpx.Timeout(15.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{self.settings.bot_token}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": text,
                },
            )
            response.raise_for_status()
            payload = response.json()
            if not payload.get("ok"):
                raise RuntimeError(payload.get("description") or "Telegram sendMessage failed")


class TelegramNotificationOutboxService:
    def __init__(
        self,
        *,
        settings: Settings,
        storage: BotStorage,
        sender: TelegramMessageSender | None = None,
        retry_after_seconds: int = 60,
    ) -> None:
        self.settings = settings
        self.storage = storage
        self.sender = sender or TelegramHttpMessageSender(settings)
        self.retry_after_seconds = retry_after_seconds

    async def enqueue_and_try_send(self, *, chat_id: int, text: str) -> NotificationDeliveryResult:
        notification_id = await self.storage.enqueue_telegram_notification(chat_id=chat_id, text=text)
        return await self.flush_one(notification_id)

    async def flush_pending(self, *, limit: int = 20) -> NotificationFlushResult:
        delivered_count = 0
        failed_count = 0
        for notification in await self.storage.list_pending_telegram_notifications(limit=limit):
            result = await self._deliver(notification)
            if result.delivered:
                delivered_count += 1
            else:
                failed_count += 1
        return NotificationFlushResult(delivered_count=delivered_count, failed_count=failed_count)

    async def flush_one(self, notification_id: int) -> NotificationDeliveryResult:
        notification = await self.storage.get_telegram_notification(notification_id)
        if not notification:
            return NotificationDeliveryResult(
                notification_id=notification_id,
                delivered=False,
                error="Notification not found",
            )
        if notification.status != TELEGRAM_NOTIFICATION_PENDING:
            return NotificationDeliveryResult(
                notification_id=notification_id,
                delivered=notification.status == TELEGRAM_NOTIFICATION_SENT,
            )
        return await self._deliver(notification)

    async def _deliver(self, notification: TelegramNotification) -> NotificationDeliveryResult:
        notification_id = notification.id
        try:
            await self.sender.send_message(
                chat_id=notification.chat_id,
                text=notification.text,
            )
        except Exception as exc:  # noqa: BLE001
            error = str(exc)
            await self.storage.mark_telegram_notification_failed(
                notification_id,
                error=error,
                retry_after_seconds=self.retry_after_seconds,
            )
            return NotificationDeliveryResult(
                notification_id=notification_id,
                delivered=False,
                error=error,
            )

        await self.storage.mark_telegram_notification_sent(notification_id)
        return NotificationDeliveryResult(notification_id=notification_id, delivered=True)
