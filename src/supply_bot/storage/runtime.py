from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import aiosqlite

from supply_bot.storage_bootstrap import initialize_storage
from supply_bot.storage_catalog import CatalogStorageMixin
from supply_bot.storage_estimates import (
    EstimateCoreStorageMixin,
    EstimateDoorsStorageMixin,
    EstimateFlooringStorageMixin,
    EstimateWallFinishStorageMixin,
)
from supply_bot.storage_projects import ProjectsStorageMixin
from supply_bot.storage_requests import GroupRequestsStorageMixin

# Composition root persistence-слоя: BotStorage собирает domain mixins и runtime helpers.


class BotStorage(
    CatalogStorageMixin,
    GroupRequestsStorageMixin,
    ProjectsStorageMixin,
    EstimateDoorsStorageMixin,
    EstimateWallFinishStorageMixin,
    EstimateFlooringStorageMixin,
    EstimateCoreStorageMixin,
):
    def __init__(self, database_path: Path) -> None:
        self.database_path = database_path

    @asynccontextmanager
    async def connection(self) -> Any:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        db = await aiosqlite.connect(self.database_path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON;")
        try:
            yield db
        finally:
            await db.close()

    async def initialize(self) -> None:
        await initialize_storage(self.connection)

    async def ensure_runtime_settings(
        self,
        *,
        delivery_start: str,
        delivery_end: str,
        delivery_fallback: str,
    ) -> None:
        async with self.connection() as db:
            for key, value in {
                "delivery_start": delivery_start,
                "delivery_end": delivery_end,
                "delivery_fallback": delivery_fallback,
            }.items():
                await db.execute(
                    "INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)",
                    (key, value),
                )
            await db.commit()

    async def get_delivery_defaults(self, fallback: dict[str, str]) -> dict[str, str]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT key, value
                FROM bot_settings
                WHERE key IN ('delivery_start', 'delivery_end', 'delivery_fallback')
                """
            )
            rows = await cursor.fetchall()
        values = dict(fallback)
        for row in rows:
            values[row["key"]] = row["value"]
        return values

    async def update_delivery_defaults(
        self,
        *,
        delivery_start: str | None = None,
        delivery_end: str | None = None,
        delivery_fallback: str | None = None,
    ) -> None:
        updates = {
            "delivery_start": delivery_start,
            "delivery_end": delivery_end,
            "delivery_fallback": delivery_fallback,
        }
        async with self.connection() as db:
            for key, value in updates.items():
                if value is None:
                    continue
                await db.execute(
                    """
                    INSERT INTO bot_settings (key, value, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    (key, value),
                )
            await db.commit()
