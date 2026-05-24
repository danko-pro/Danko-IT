from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Protocol

import httpx

from supply_bot.admin_api.schemas.public import PublicLeadPayload
from supply_bot.config import Settings

PUBLIC_LEAD_COMMENT_LIMIT = 1000
PUBLIC_LEAD_TELEGRAM_TIMEOUT_SECONDS = 15.0
TelegramSendFunc = Callable[[str, int, str, float], Awaitable[None]]


class PublicLeadNotifier(Protocol):
    async def notify(self, payload: PublicLeadPayload) -> bool: ...


class PublicLeadTelegramNotifier:
    def __init__(
        self,
        *,
        token: str | None,
        chat_id: int | None,
        timeout_seconds: float = PUBLIC_LEAD_TELEGRAM_TIMEOUT_SECONDS,
        send_func: TelegramSendFunc | None = None,
    ) -> None:
        self._token = token
        self._chat_id = chat_id
        self._timeout_seconds = timeout_seconds
        self._send_func = send_func or _send_telegram_message

    @classmethod
    def from_settings(cls, settings: Settings) -> PublicLeadTelegramNotifier:
        return cls(
            token=settings.telegram_public_bot_token,
            chat_id=settings.telegram_leads_chat_id,
        )

    async def notify(self, payload: PublicLeadPayload) -> bool:
        if not self._token or self._chat_id is None:
            return False

        await self._send_func(
            self._token,
            self._chat_id,
            build_public_lead_message(payload),
            self._timeout_seconds,
        )
        return True


def build_public_lead_message(payload: PublicLeadPayload) -> str:
    comment = payload.comment.strip()
    if len(comment) > PUBLIC_LEAD_COMMENT_LIMIT:
        comment = f"{comment[:PUBLIC_LEAD_COMMENT_LIMIT].rstrip()}..."

    return "\n".join(
        [
            "Новая заявка Danko BuildTech",
            "",
            f"Имя: {_display_value(payload.name)}",
            f"Контакт: {_display_value(payload.phone)}",
            f"Способ связи: {_display_value(payload.contactMethod)}",
            f"Тип объекта: {_display_value(payload.objectType)}",
            f"Площадь: {_display_value(payload.area)}",
            f"Формат: {_display_value(payload.packageType)}",
            f"Комментарий: {_display_value(comment)}",
            "",
            "Источник: public landing",
            "Согласие на обработку данных: получено",
        ]
    )


def _display_value(value: str) -> str:
    return value.strip() or "не указано"


async def _send_telegram_message(
    token: str,
    chat_id: int,
    text: str,
    timeout_seconds: float,
) -> None:
    timeout = httpx.Timeout(timeout_seconds, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("ok") is not True:
            raise RuntimeError("Telegram public lead notification failed")
