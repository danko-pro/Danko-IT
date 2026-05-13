from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata
from supply_bot.storage_auth.repository import SqlAlchemyUserAuthRepository


class SqlAlchemyUserAuthRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_dir.name) / "auth.sqlite3"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{database_path.as_posix()}")
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        self.repository = SqlAlchemyUserAuthRepository(async_sessionmaker(self.engine, expire_on_commit=False))

    async def asyncTearDown(self) -> None:
        await self.engine.dispose()
        self.temp_dir.cleanup()

    async def test_create_lookup_and_touch_user(self) -> None:
        user = await self.repository.create_app_user(
            email="USER@example.com",
            display_name="User",
            password_hash="hash",
        )

        self.assertEqual("user@example.com", user["email"])
        self.assertEqual("User", user["display_name"])
        self.assertEqual("user", user["role"])
        self.assertEqual(1, int(user["is_active"]))

        by_email = await self.repository.get_app_user_by_email("user@example.com")
        self.assertIsNotNone(by_email)
        self.assertEqual(user["id"], by_email["id"])

        await self.repository.touch_app_user_login(int(user["id"]))
        updated = await self.repository.get_app_user_by_id(int(user["id"]))
        self.assertIsNotNone(updated)
        self.assertTrue(updated["last_login_at"])

    async def test_duplicate_email_is_rejected(self) -> None:
        await self.repository.create_app_user(
            email="user@example.com",
            display_name="User",
            password_hash="hash",
        )

        with self.assertRaises(ValueError):
            await self.repository.create_app_user(
                email="USER@example.com",
                display_name="User",
                password_hash="hash",
            )
