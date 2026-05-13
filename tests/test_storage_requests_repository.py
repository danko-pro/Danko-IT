from __future__ import annotations

import unittest

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from supply_bot.database.metadata import metadata
from supply_bot.storage_notifications import SqlAlchemyTelegramNotificationRepository
from supply_bot.storage_requests import SqlAlchemyRequestRuntimeRepository


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
