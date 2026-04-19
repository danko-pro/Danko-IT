from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import aiosqlite

# Общие helper-операции для дозаполнения seed-данных.


async def insert_missing_title_rows(
    db: aiosqlite.Connection,
    *,
    table: str,
    rows: Sequence[tuple[Any, ...]],
    insert_sql: str,
) -> None:
    cursor = await db.execute(f"SELECT title FROM {table}")
    existing_titles = {str(row["title"]) for row in await cursor.fetchall()}
    for row in rows:
        if str(row[0]) in existing_titles:
            continue
        await db.execute(insert_sql, row)


__all__ = ["insert_missing_title_rows"]
