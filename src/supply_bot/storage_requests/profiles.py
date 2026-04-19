from __future__ import annotations

from typing import Any

# Профили объектов/групп и их delivery-настройки.


class RequestProfilesStorageMixin:
    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT chat_id, title, raw_description, object_name, address, flat, floor, elevator,
                       delivery_rules, delivery_start, delivery_end, delivery_fallback, updated_at
                FROM group_profiles
                WHERE chat_id = ?
                """,
                (chat_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def upsert_group_profile(self, profile: dict[str, Any]) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO group_profiles (
                    chat_id, title, raw_description, object_name, address, flat, floor, elevator,
                    delivery_rules, delivery_start, delivery_end, delivery_fallback, updated_at
                )
                VALUES (:chat_id, :title, :raw_description, :object_name, :address, :flat, :floor, :elevator,
                        :delivery_rules, :delivery_start, :delivery_end, :delivery_fallback, CURRENT_TIMESTAMP)
                ON CONFLICT(chat_id) DO UPDATE SET
                    title = excluded.title,
                    raw_description = excluded.raw_description,
                    object_name = excluded.object_name,
                    address = excluded.address,
                    flat = excluded.flat,
                    floor = excluded.floor,
                    elevator = excluded.elevator,
                    delivery_rules = excluded.delivery_rules,
                    delivery_start = excluded.delivery_start,
                    delivery_end = excluded.delivery_end,
                    delivery_fallback = excluded.delivery_fallback,
                    updated_at = CURRENT_TIMESTAMP
                """,
                profile,
            )
            await db.commit()
