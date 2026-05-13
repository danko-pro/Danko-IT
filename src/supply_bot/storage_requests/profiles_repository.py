from __future__ import annotations

from typing import Any

from sqlalchemy import insert, select, update

from supply_bot.storage_requests.tables import group_profiles
from supply_bot.storage_scope import OwnerScopedSqlAlchemyRepository


class SqlAlchemyRequestProfilesRepository(OwnerScopedSqlAlchemyRepository):
    async def list_group_profiles(self, *, limit: int = 20) -> list[dict[str, Any]]:
        safe_limit = max(1, min(limit, 100))
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    select(
                        group_profiles.c.chat_id,
                        group_profiles.c.title,
                        group_profiles.c.object_name,
                        group_profiles.c.address,
                        group_profiles.c.flat,
                        group_profiles.c.floor,
                        group_profiles.c.elevator,
                        group_profiles.c.delivery_start,
                        group_profiles.c.delivery_end,
                        group_profiles.c.delivery_fallback,
                        group_profiles.c.updated_at,
                    )
                    .where(self._owner_clause(group_profiles))
                    .order_by(group_profiles.c.updated_at.desc())
                    .limit(safe_limit)
                )
            ).mappings().all()
        return [dict(row) for row in rows]

    async def get_group_profile(self, chat_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    select(
                        group_profiles.c.chat_id,
                        group_profiles.c.title,
                        group_profiles.c.raw_description,
                        group_profiles.c.object_name,
                        group_profiles.c.address,
                        group_profiles.c.flat,
                        group_profiles.c.floor,
                        group_profiles.c.elevator,
                        group_profiles.c.delivery_rules,
                        group_profiles.c.delivery_start,
                        group_profiles.c.delivery_end,
                        group_profiles.c.delivery_fallback,
                        group_profiles.c.updated_at,
                        group_profiles.c.owner_user_id,
                    )
                    .where(self._owner_clause(group_profiles), group_profiles.c.chat_id == chat_id)
                    .limit(1)
                )
            ).mappings().first()
        return dict(row) if row else None

    async def upsert_group_profile(self, profile: dict[str, Any]) -> None:
        values = {
            "owner_user_id": self._owner_user_id,
            "chat_id": profile["chat_id"],
            "title": profile.get("title"),
            "raw_description": profile.get("raw_description"),
            "object_name": profile.get("object_name"),
            "address": profile.get("address"),
            "flat": profile.get("flat"),
            "floor": profile.get("floor"),
            "elevator": profile.get("elevator"),
            "delivery_rules": profile.get("delivery_rules"),
            "delivery_start": profile.get("delivery_start"),
            "delivery_end": profile.get("delivery_end"),
            "delivery_fallback": profile.get("delivery_fallback"),
        }
        async with self._session_factory() as session:
            existing = (
                await session.execute(
                    select(group_profiles.c.chat_id)
                    .where(self._owner_clause(group_profiles), group_profiles.c.chat_id == profile["chat_id"])
                    .limit(1)
                )
            ).scalar_one_or_none()
            if existing is None:
                await session.execute(insert(group_profiles).values(**values))
            else:
                await session.execute(
                    update(group_profiles)
                    .where(self._owner_clause(group_profiles), group_profiles.c.chat_id == profile["chat_id"])
                    .values(**values)
                )
            await session.commit()
