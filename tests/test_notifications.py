from __future__ import annotations

import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings
from supply_bot.services.notifications import TelegramHttpMessageSender, TelegramNotificationOutboxService
from supply_bot.storage import BotStorage


class FakeTelegramSender:
    def __init__(self) -> None:
        self.fail_next = False
        self.sent: list[dict] = []

    async def send_message(self, *, chat_id: int, text: str) -> None:
        if self.fail_next:
            self.fail_next = False
            raise RuntimeError("network is down")
        self.sent.append({"chat_id": chat_id, "text": text})


def _settings():
    return SimpleNamespace(bot_token="test-token")


def _create_settings_file(root: Path) -> Path:
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                "ADMIN_PASSWORD_HASH=your_admin_password_hash_here",
                "ADMIN_SESSION_SECRET=your_admin_session_secret_here",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_notification_outbox_marks_sent_after_success() -> None:
    with TemporaryDirectory() as tmp_dir:
        storage = BotStorage(Path(tmp_dir) / "test.sqlite3")
        asyncio.run(storage.initialize())
        sender = FakeTelegramSender()
        service = TelegramNotificationOutboxService(settings=_settings(), storage=storage, sender=sender)

        result = asyncio.run(service.enqueue_and_try_send(chat_id=1001, text="hello"))
        row = asyncio.run(storage.get_telegram_notification(result.notification_id))

        assert result.delivered is True
        assert sender.sent == [{"chat_id": 1001, "text": "hello"}]
        assert row.status == "sent"
        assert row.sent_at


def test_notification_outbox_keeps_pending_after_failure_and_retries() -> None:
    with TemporaryDirectory() as tmp_dir:
        storage = BotStorage(Path(tmp_dir) / "test.sqlite3")
        asyncio.run(storage.initialize())
        sender = FakeTelegramSender()
        sender.fail_next = True
        service = TelegramNotificationOutboxService(settings=_settings(), storage=storage, sender=sender)

        failed = asyncio.run(service.enqueue_and_try_send(chat_id=1001, text="retry me"))
        failed_row = asyncio.run(storage.get_telegram_notification(failed.notification_id))
        retried = asyncio.run(service.flush_one(failed.notification_id))
        retried_row = asyncio.run(storage.get_telegram_notification(failed.notification_id))

        assert failed.delivered is False
        assert failed.error == "network is down"
        assert failed_row.status == "pending"
        assert failed_row.attempts == 1
        assert failed_row.last_error == "network is down"
        assert retried.delivered is True
        assert retried_row.status == "sent"
        assert sender.sent == [{"chat_id": 1001, "text": "retry me"}]


def test_admin_can_list_and_flush_telegram_notifications(monkeypatch) -> None:
    sent: list[dict] = []

    async def fake_send_message(self, *, chat_id: int, text: str) -> None:
        sent.append({"chat_id": chat_id, "text": text})

    monkeypatch.setattr(TelegramHttpMessageSender, "send_message", fake_send_message)

    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            notification_id = asyncio.run(
                client.app.state.storage.enqueue_telegram_notification(chat_id=1001, text="queued")
            )

            list_response = client.get("/api/notifications/telegram")
            flush_response = client.post("/api/notifications/telegram/flush")
            sent_row = asyncio.run(client.app.state.storage.get_telegram_notification(notification_id))

            assert list_response.status_code == 200
            assert list_response.json()[0]["id"] == notification_id
            assert flush_response.status_code == 200
            assert flush_response.json() == {"delivered_count": 1, "failed_count": 0}
            assert sent_row.status == "sent"
            assert sent == [{"chat_id": 1001, "text": "queued"}]
