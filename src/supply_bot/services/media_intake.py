from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any

from aiogram import Bot
from aiogram.types import Message

from supply_bot.config import Settings
from supply_bot.services.llm_client import LlmProviderClient


@dataclass(frozen=True, slots=True)
class TelegramMediaTextResult:
    text: str | None
    reason: str | None = None


class TelegramMediaIntakeService:
    def __init__(self, settings: Settings, *, client: LlmProviderClient | None = None) -> None:
        self.settings = settings
        self.client = client or LlmProviderClient(settings)

    async def transcribe_group_audio_message(self, bot: Bot, message: Message) -> TelegramMediaTextResult:
        media = message.voice or message.audio
        if media is None:
            return TelegramMediaTextResult(text=None, reason="Message does not contain audio")

        file_size = int(getattr(media, "file_size", 0) or 0)
        if file_size > self.settings.telegram_media_max_download_bytes:
            return TelegramMediaTextResult(text=None, reason="Telegram audio file is too large")

        telegram_file = await bot.get_file(media.file_id)
        destination = BytesIO()
        await bot.download_file(telegram_file.file_path, destination=destination)
        audio_bytes = destination.getvalue()
        if len(audio_bytes) > self.settings.telegram_media_max_download_bytes:
            return TelegramMediaTextResult(text=None, reason="Telegram audio file is too large")

        file_name = self._audio_file_name(message, media)
        mime_type = self._audio_mime_type(message, media)
        transcript = await self.client.transcribe_audio_bytes(
            audio_bytes,
            file_name=file_name,
            mime_type=mime_type,
        )
        if not transcript:
            return TelegramMediaTextResult(text=None, reason="Audio transcription is not configured or returned empty")
        return TelegramMediaTextResult(text=transcript)

    def _audio_file_name(self, message: Message, media: Any) -> str:
        file_name = str(getattr(media, "file_name", "") or "").strip()
        if file_name:
            return file_name
        extension = ".mp3" if message.audio else ".ogg"
        return f"telegram-audio-{message.message_id}{extension}"

    def _audio_mime_type(self, message: Message, media: Any) -> str:
        mime_type = str(getattr(media, "mime_type", "") or "").strip()
        if mime_type:
            return mime_type
        return "audio/mpeg" if message.audio else "audio/ogg"
