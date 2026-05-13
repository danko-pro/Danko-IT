from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


class OwnerScopedSqlAlchemyRepository:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        owner_user_id: int | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._owner_user_id = owner_user_id

    def for_owner(self, owner_user_id: int | None) -> OwnerScopedSqlAlchemyRepository:
        return type(self)(self._session_factory, owner_user_id=owner_user_id)

    def _owner_clause(self, table) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return table.c.owner_user_id == self._owner_user_id


class RequiredOwnerScopedSqlAlchemyRepository(OwnerScopedSqlAlchemyRepository):
    def _required_owner_user_id(self) -> int:
        if self._owner_user_id is None:
            raise RuntimeError("owner_user_id обязателен для этого репозитория")
        return self._owner_user_id

    def _required_owner_clause(self, table):
        return table.c.owner_user_id == self._required_owner_user_id()
