from __future__ import annotations

import asyncio
from io import BytesIO
from types import SimpleNamespace

from supply_bot.services.media_intake import TelegramMediaIntakeService


class FakeTelegramBot:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload

    async def get_file(self, file_id: str) -> SimpleNamespace:
        return SimpleNamespace(file_path=f"{file_id}.ogg")

    async def download_file(self, file_path: str, *, destination: BytesIO) -> None:
        destination.write(self.payload)


class FakeTranscriptionClient:
    def __init__(self, transcript: str | None) -> None:
        self.transcript = transcript
        self.calls: list[dict] = []

    async def transcribe_audio_bytes(self, audio_bytes: bytes, *, file_name: str, mime_type: str | None) -> str | None:
        self.calls.append({"audio_bytes": audio_bytes, "file_name": file_name, "mime_type": mime_type})
        return self.transcript


def _settings(*, max_bytes: int = 100) -> SimpleNamespace:
    return SimpleNamespace(telegram_media_max_download_bytes=max_bytes)


def test_telegram_media_intake_transcribes_voice_message() -> None:
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
    client = FakeTranscriptionClient("ignored")
    service = TelegramMediaIntakeService(_settings(max_bytes=3), client=client)
    message = SimpleNamespace(
        message_id=7,
        voice=SimpleNamespace(file_id="voice-file-id", file_size=5),
        audio=None,
    )

    result = asyncio.run(service.transcribe_group_audio_message(FakeTelegramBot(b"audio"), message))

    assert result.text is None
    assert result.reason == "Telegram audio file is too large"
    assert client.calls == []
