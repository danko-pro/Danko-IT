from __future__ import annotations

from typing import Any

from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.storage_auth.tables import app_users


def normalize_app_user_email(email: str) -> str:
    return str(email or "").strip().lower()


class SqlAlchemyUserAuthRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def create_app_user(
        self,
        *,
        email: str,
        password_hash: str,
        display_name: str = "",
        role: str = "user",
    ) -> dict[str, Any]:
        normalized_email = normalize_app_user_email(email)
        if not normalized_email or "@" not in normalized_email:
            raise ValueError("Email is required")

        async with self.session_factory() as session:
            try:
                result = await session.execute(
                    insert(app_users).values(
                        email=normalized_email,
                        display_name=str(display_name or "").strip(),
                        password_hash=password_hash,
                        role=str(role or "user").strip() or "user",
                    )
                )
                await session.commit()
            except IntegrityError as exc:
                await session.rollback()
                raise ValueError("Email is already registered") from exc

        user_id = int(result.inserted_primary_key[0])
        user = await self.get_app_user_by_id(user_id)
        if user is None:
            raise ValueError("User was not created")
        return user

    async def get_app_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        async with self.session_factory() as session:
            result = await session.execute(select(app_users).where(app_users.c.id == user_id))
            row = result.mappings().first()
        return dict(row) if row else None

    async def get_app_user_by_email(self, email: str) -> dict[str, Any] | None:
        normalized_email = normalize_app_user_email(email)
        async with self.session_factory() as session:
            result = await session.execute(select(app_users).where(app_users.c.email == normalized_email))
            row = result.mappings().first()
        return dict(row) if row else None

    async def touch_app_user_login(self, user_id: int) -> None:
        async with self.session_factory() as session:
            await session.execute(
                update(app_users)
                .where(app_users.c.id == user_id)
                .values(
                    last_login_at=func.current_timestamp(),
                    updated_at=func.current_timestamp(),
                )
            )
            await session.commit()

    async def provision_bootstrap_admin(
        self,
        *,
        email: str,
        password_hash: str,
        display_name: str | None = None,
    ) -> str:
        normalized_email = normalize_app_user_email(email)
        if not normalized_email or "@" not in normalized_email:
            raise ValueError("Email is required")

        existing = await self.get_app_user_by_email(normalized_email)
        if existing is None:
            await self.create_app_user(
                email=normalized_email,
                password_hash=password_hash,
                display_name=str(display_name or "").strip(),
                role="admin",
            )
            return "created"

        update_values: dict[str, Any] = {
            "role": "admin",
            "is_active": 1,
            "password_hash": password_hash,
            "updated_at": func.current_timestamp(),
        }
        if display_name is not None:
            update_values["display_name"] = str(display_name).strip()

        async with self.session_factory() as session:
            await session.execute(
                update(app_users)
                .where(app_users.c.id == existing["id"])
                .values(**update_values)
            )
            await session.commit()
        return "updated"
