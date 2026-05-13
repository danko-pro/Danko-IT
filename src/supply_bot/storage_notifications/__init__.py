"""Persistence для Telegram notification outbox."""

from supply_bot.storage_notifications.legacy import TelegramNotificationOutboxStorageMixin
from supply_bot.storage_notifications.repository import SqlAlchemyTelegramNotificationRepository

__all__ = [
    "SqlAlchemyTelegramNotificationRepository",
    "TelegramNotificationOutboxStorageMixin",
]
