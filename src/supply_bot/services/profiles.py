from __future__ import annotations

import re
from datetime import time
from typing import Any

from aiogram import Bot

from supply_bot.config import Settings
from supply_bot.storage import BotStorage

TIME_RANGE_PATTERN = re.compile(
    r"(?:с\s*)?(\d{1,2}[:.]\d{2})\s*(?:до|-|–)\s*(\d{1,2}[:.]\d{2})",
    re.IGNORECASE,
)


class GroupProfileService:
    def __init__(self, storage: BotStorage, settings: Settings) -> None:
        self.storage = storage
        self.settings = settings

    async def sync_from_telegram(self, bot: Bot, chat_id: int) -> dict[str, Any]:
        chat = await bot.get_chat(chat_id)
        description = getattr(chat, "description", None) or ""
        delivery_defaults = await self.storage.get_delivery_defaults(
            {
                "delivery_start": self.settings.default_delivery_start.strftime("%H:%M"),
                "delivery_end": self.settings.default_delivery_end.strftime("%H:%M"),
                "delivery_fallback": self.settings.default_delivery_fallback.strftime("%H:%M"),
            }
        )
        profile = self.build_profile_payload(
            chat_id=chat_id,
            title=chat.title or str(chat_id),
            description=description,
            delivery_defaults=delivery_defaults,
        )
        await self.storage.upsert_group_profile(profile)
        saved = await self.storage.get_group_profile(chat_id)
        if saved is None:
            raise RuntimeError("Не удалось сохранить профиль группы.")
        return saved

    def build_profile_payload(
        self,
        *,
        chat_id: int,
        title: str,
        description: str,
        delivery_defaults: dict[str, str],
    ) -> dict[str, Any]:
        lines = [line.strip() for line in description.splitlines() if line.strip()]
        joined = "\n".join(lines)

        address = self._extract(joined, r"(?:адрес|локация)\s*[:\-]\s*(.+)")
        flat = self._extract(joined, r"(?:кв(?:артира)?)\s*[:\-]\s*([^\n,]+)")
        floor = self._extract(joined, r"(?:этаж)\s*[:\-]\s*([^\n,]+)")
        elevator = self._extract(joined, r"(?:лифт)\s*[:\-]\s*([^\n,]+)")
        object_name = self._extract(joined, r"(?:объект|название)\s*[:\-]\s*(.+)")

        delivery_line = next(
            (line for line in lines if "достав" in line.lower() or "прием" in line.lower()),
            "",
        )
        start_time, end_time = self._extract_time_range(delivery_line or joined)

        return {
            "chat_id": chat_id,
            "title": title,
            "raw_description": description,
            "object_name": object_name or title,
            "address": address,
            "flat": flat,
            "floor": floor,
            "elevator": elevator,
            "delivery_rules": delivery_line or None,
            "delivery_start": start_time.strftime("%H:%M") if start_time else delivery_defaults["delivery_start"],
            "delivery_end": end_time.strftime("%H:%M") if end_time else delivery_defaults["delivery_end"],
            "delivery_fallback": delivery_defaults["delivery_fallback"],
        }

    def _extract(self, text: str, pattern: str) -> str | None:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            return None
        return match.group(1).strip()

    def _extract_time_range(self, text: str) -> tuple[time | None, time | None]:
        match = TIME_RANGE_PATTERN.search(text)
        if not match:
            return None, None
        return self._parse_time(match.group(1)), self._parse_time(match.group(2))

    def _parse_time(self, value: str) -> time:
        hour, minute = value.replace(".", ":").split(":", maxsplit=1)
        return time(int(hour), int(minute))
