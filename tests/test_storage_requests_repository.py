from __future__ import annotations

import unittest

from sqlalchemy import BigInteger
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_notifications import SqlAlchemyTelegramNotificationRepository
from supply_bot.storage_notifications.tables import telegram_notification_outbox
from supply_bot.storage_requests import SqlAlchemyRequestRuntimeRepository
from supply_bot.storage_requests.tables import (
    group_message_history,
    group_profiles,
    request_draft_participants,
    request_drafts,
)

TELEGRAM_SUPERGROUP_CHAT_ID = -1003887195743
TELEGRAM_USER_ID = 5000000001


class SqlAlchemyRequestRuntimeRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False)

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()

    async def test_request_owner_isolation_and_summary(self) -> None:
        root = SqlAlchemyRequestRuntimeRepository(self.session_factory)
        user_one = root.for_owner(1)
        user_two = root.for_owner(2)

        await user_one.upsert_group_profile(
            {
                "chat_id": 1001,
                "title": "Project group",
                "raw_description": None,
                "object_name": "Object Alpha",
                "address": None,
                "flat": None,
                "floor": None,
                "elevator": None,
                "delivery_rules": None,
                "delivery_start": None,
                "delivery_end": None,
                "delivery_fallback": None,
            }
        )
        draft_id = await user_one.create_draft(chat_id=1001, master_id=2002, master_name="Tester")
        await user_two.upsert_group_profile(
            {
                "chat_id": 1001,
                "title": "Another project group",
                "raw_description": None,
                "object_name": "Object Beta",
                "address": None,
                "flat": None,
                "floor": None,
                "elevator": None,
                "delivery_rules": None,
                "delivery_start": None,
                "delivery_end": None,
                "delivery_fallback": None,
            }
        )
        draft_two_id = await user_two.create_draft(chat_id=1001, master_id=3003, master_name="Other tester")
        await user_one.create_request_item(
            draft_id=draft_id,
            family_id=None,
            variant_id=None,
            sku_id=None,
            raw_name="Profiled material",
            normalized_name="profiled material",
            quantity=2,
            unit="pcs",
        )

        self.assertIsNotNone(await user_one.get_draft(draft_id))
        self.assertIsNone(await user_two.get_draft(draft_id))
        self.assertIsNone(await user_one.get_draft(draft_two_id))
        self.assertIsNotNone(await user_two.get_draft(draft_two_id))

        summaries = await user_one.list_recent_request_summaries(limit=10)
        summary = next(item for item in summaries if item.id == draft_id)
        user_two_summary = next(item for item in await user_two.list_recent_request_summaries(limit=10))

        self.assertEqual(summary.object_name, "Object Alpha")
        self.assertEqual(summary.items_count, 1)
        self.assertEqual(user_two_summary.object_name, "Object Beta")
        self.assertEqual(user_two_summary.items_count, 0)

    async def test_notification_outbox_owner_isolation(self) -> None:
        root = SqlAlchemyTelegramNotificationRepository(self.session_factory)
        user_one = root.for_owner(1)
        user_two = root.for_owner(2)

        notification_id = await user_one.enqueue_telegram_notification(chat_id=1001, text="hello")

        self.assertIsNotNone(await user_one.get_telegram_notification(notification_id))
        self.assertIsNone(await user_two.get_telegram_notification(notification_id))
        self.assertEqual(len(await user_one.list_pending_telegram_notifications(limit=10)), 1)
        self.assertEqual(await user_two.list_pending_telegram_notifications(limit=10), [])

    async def test_request_runtime_accepts_large_telegram_identifiers(self) -> None:
        root = SqlAlchemyRequestRuntimeRepository(self.session_factory)
        repository = root.for_owner(1)

        await repository.upsert_group_profile(
            {
                "chat_id": TELEGRAM_SUPERGROUP_CHAT_ID,
                "title": "Supergroup",
                "raw_description": None,
                "object_name": "Large chat object",
                "address": None,
                "flat": None,
                "floor": None,
                "elevator": None,
                "delivery_rules": None,
                "delivery_start": None,
                "delivery_end": None,
                "delivery_fallback": None,
            }
        )
        draft_id = await repository.create_draft(
            chat_id=TELEGRAM_SUPERGROUP_CHAT_ID,
            master_id=TELEGRAM_USER_ID,
            master_name="Telegram user",
        )
        await repository.add_group_message(
            chat_id=TELEGRAM_SUPERGROUP_CHAT_ID,
            user_id=TELEGRAM_USER_ID,
            user_name="Telegram user",
            message_id=42,
            text="бот заявка кабель 150 м.п.",
        )

        draft = await repository.get_active_draft(chat_id=TELEGRAM_SUPERGROUP_CHAT_ID, master_id=TELEGRAM_USER_ID)
        profile = await repository.get_group_profile(TELEGRAM_SUPERGROUP_CHAT_ID)
        messages = await repository.list_recent_group_messages(
            chat_id=TELEGRAM_SUPERGROUP_CHAT_ID,
            user_id=TELEGRAM_USER_ID,
            limit=5,
        )
        expired_count = await repository.expire_stale_active_drafts(
            max_age_hours=24,
            chat_id=TELEGRAM_SUPERGROUP_CHAT_ID,
        )

        self.assertEqual(draft["id"], draft_id)
        self.assertEqual(draft["chat_id"], TELEGRAM_SUPERGROUP_CHAT_ID)
        self.assertEqual(draft["master_id"], TELEGRAM_USER_ID)
        self.assertEqual(profile["chat_id"], TELEGRAM_SUPERGROUP_CHAT_ID)
        self.assertEqual(messages[0]["chat_id"], TELEGRAM_SUPERGROUP_CHAT_ID)
        self.assertEqual(messages[0]["user_id"], TELEGRAM_USER_ID)
        self.assertEqual(expired_count, 0)

    async def test_notification_outbox_accepts_large_telegram_chat_id(self) -> None:
        repository = SqlAlchemyTelegramNotificationRepository(self.session_factory).for_owner(1)

        notification_id = await repository.enqueue_telegram_notification(
            chat_id=TELEGRAM_SUPERGROUP_CHAT_ID,
            text="large chat",
        )

        notification = await repository.get_telegram_notification(notification_id)

        self.assertIsNotNone(notification)
        self.assertEqual(notification.chat_id, TELEGRAM_SUPERGROUP_CHAT_ID)

    def test_telegram_identifier_columns_are_bigint(self) -> None:
        columns = (
            request_drafts.c.chat_id,
            request_drafts.c.master_id,
            request_draft_participants.c.user_id,
            group_profiles.c.chat_id,
            group_message_history.c.chat_id,
            group_message_history.c.user_id,
            telegram_notification_outbox.c.chat_id,
        )

        for column in columns:
            self.assertIsInstance(column.type, BigInteger)
