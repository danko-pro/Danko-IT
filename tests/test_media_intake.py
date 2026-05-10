"""Тесты Telegram media intake слоя."""

from __future__ import annotations

import asyncio
from io import BytesIO
from types import SimpleNamespace

from supply_bot.handlers.group import _format_transcript_preview
from supply_bot.services.media_intake import TelegramMediaIntakeService


class FakeTelegramBot:
    """Минимальная подмена Telegram Bot для проверки скачивания файла."""

    def __init__(self, payload: bytes) -> None:
        self.payload = payload

    async def get_file(self, file_id: str) -> SimpleNamespace:
        return SimpleNamespace(file_path=f"{file_id}.ogg")

    async def download_file(self, file_path: str, *, destination: BytesIO) -> None:
        destination.write(self.payload)


class FakeTranscriptionClient:
    """Подмена AI-клиента, которая возвращает заранее заданный transcript."""

    def __init__(self, transcript: str | None) -> None:
        self.transcript = transcript
        self.calls: list[dict] = []

    async def transcribe_audio_bytes(self, audio_bytes: bytes, *, file_name: str, mime_type: str | None) -> str | None:
        self.calls.append({"audio_bytes": audio_bytes, "file_name": file_name, "mime_type": mime_type})
        return self.transcript


def _settings(*, max_bytes: int = 100) -> SimpleNamespace:
    """Создает минимальную конфигурацию для media intake tests."""
    return SimpleNamespace(telegram_media_max_download_bytes=max_bytes)


def test_telegram_media_intake_transcribes_voice_message() -> None:
    """Проверяет успешный путь voice -> bytes -> transcript."""
    client = FakeTranscriptionClient("danko_ai_bot привези цемент")
    service = TelegramMediaIntakeService(_settings(), client=client)
    message = SimpleNamespace(
        message_id=7,
        voice=SimpleNamespace(file_id="voice-file-id", file_size=5),
        audio=None,
    )

    result = asyncio.run(service.transcribe_group_audio_message(FakeTelegramBot(b"audio"), message))

    assert result.text == "danko_ai_bot привези цемент"
    assert client.calls == [{"audio_bytes": b"audio", "file_name": "telegram-audio-7.ogg", "mime_type": "audio/ogg"}]


def test_telegram_media_intake_rejects_large_audio_before_download() -> None:
    """Проверяет отказ от скачивания файла, который уже слишком большой по metadata."""
    client = FakeTranscriptionClient("ignored")
    service = TelegramMediaIntakeService(_settings(max_bytes=3), client=client)
    message = SimpleNamespace(
        message_id=7,
        voice=SimpleNamespace(file_id="voice-file-id", file_size=5),
        audio=None,
    )

    result = asyncio.run(service.transcribe_group_audio_message(FakeTelegramBot(b"audio"), message))

    assert result.text is None
    assert result.reason == "Аудиофайл слишком большой"
    assert client.calls == []


def test_format_transcript_preview_collapses_and_trims_text() -> None:
    """Проверяет короткий диагностический transcript для ответа в чат."""
    text = "  " + ("слово " * 80)

    preview = _format_transcript_preview(text)

    assert len(preview) <= 180
    assert preview.endswith("…")
    assert "  " not in preview
