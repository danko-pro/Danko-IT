"""Слой приема медиа из Telegram.

Модуль превращает голосовые и аудио сообщения в текстовый вход для основного диалога.
Здесь не принимаются бизнес-решения: сервис только скачивает, проверяет лимиты и транскрибирует.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from io import BytesIO
from typing import Any

from aiogram import Bot
from aiogram.types import Message

from supply_bot.config import Settings
from supply_bot.services.llm_client import LlmProviderClient

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class TelegramMediaTextResult:
    """Результат попытки получить текст из Telegram-медиа."""

    text: str | None
    reason: str | None = None


class TelegramMediaIntakeService:
    """Сервис нормализации Telegram voice/audio в текст."""

    def __init__(self, settings: Settings, *, client: LlmProviderClient | None = None) -> None:
        """Сохраняет конфигурацию и AI-клиент, который выполнит транскрибацию."""
        self.settings = settings
        self.client = client or LlmProviderClient(settings)

    async def transcribe_group_audio_message(self, bot: Bot, message: Message) -> TelegramMediaTextResult:
        """Скачивает voice/audio из сообщения и возвращает транскрипт для dialogue flow."""
        try:
            return await self._transcribe_group_audio_message(bot, message)
        except Exception:
            logger.exception("Failed to transcribe Telegram audio message.")
            return TelegramMediaTextResult(text=None, reason="Ошибка распознавания аудио")

    async def _transcribe_group_audio_message(self, bot: Bot, message: Message) -> TelegramMediaTextResult:
        """Выполняет реальный download + transcription, чтобы внешний метод мог безопасно ловить сбои."""
        media = message.voice or message.audio
        if media is None:
            return TelegramMediaTextResult(text=None, reason="Сообщение не содержит аудио")

        # Telegram может прислать размер до скачивания; сначала отсекаем заведомо крупные файлы.
        file_size = int(getattr(media, "file_size", 0) or 0)
        if file_size > self.settings.telegram_media_max_download_bytes:
            return TelegramMediaTextResult(text=None, reason="Аудиофайл слишком большой")

        telegram_file = await bot.get_file(media.file_id)
        destination = BytesIO()
        await bot.download_file(telegram_file.file_path, destination=destination)
        audio_bytes = destination.getvalue()
        # Повторная проверка нужна, если Telegram не прислал file_size или прислал его некорректно.
        if len(audio_bytes) > self.settings.telegram_media_max_download_bytes:
            return TelegramMediaTextResult(text=None, reason="Аудиофайл слишком большой")

        file_name = self._audio_file_name(message, media)
        mime_type = self._audio_mime_type(message, media)
        transcript = await self.client.transcribe_audio_bytes(
            audio_bytes,
            file_name=file_name,
            mime_type=mime_type,
        )
        if not transcript:
            return TelegramMediaTextResult(
                text=None,
                reason="Распознавание аудио не настроено или вернуло пустой текст",
            )
        return TelegramMediaTextResult(text=transcript)

    def _audio_file_name(self, message: Message, media: Any) -> str:
        """Возвращает имя файла для transcription API."""
        file_name = str(getattr(media, "file_name", "") or "").strip()
        if file_name:
            return file_name
        extension = ".mp3" if message.audio else ".ogg"
        return f"telegram-audio-{message.message_id}{extension}"

    def _audio_mime_type(self, message: Message, media: Any) -> str:
        """Возвращает MIME type аудио, если Telegram его не передал явно."""
        mime_type = str(getattr(media, "mime_type", "") or "").strip()
        if mime_type:
            return mime_type
        return "audio/mpeg" if message.audio else "audio/ogg"
