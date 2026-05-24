from __future__ import annotations

from typing import Any

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


class OwnerScopedSqlAlchemyRepository:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        owner_user_id: int | None = None,
        include_global_reads: bool = False,
    ) -> None:
        self._session_factory = session_factory
        self._owner_user_id = owner_user_id
        self._include_global_reads = include_global_reads

    def for_owner(self, owner_user_id: int | None) -> OwnerScopedSqlAlchemyRepository:
        return type(self)(self._session_factory, owner_user_id=owner_user_id)

    def for_owner_with_global_reads(self, owner_user_id: int | None) -> OwnerScopedSqlAlchemyRepository:
        return type(self)(
            self._session_factory,
            owner_user_id=owner_user_id,
            include_global_reads=owner_user_id is not None,
        )

    def _owner_clause(self, table) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return table.c.owner_user_id == self._owner_user_id

    def _read_owner_clause(self, table) -> Any:
        if self._include_global_reads and self._owner_user_id is not None:
            return or_(table.c.owner_user_id == self._owner_user_id, table.c.owner_user_id.is_(None))
        return self._owner_clause(table)


class RequiredOwnerScopedSqlAlchemyRepository(OwnerScopedSqlAlchemyRepository):
    def _required_owner_user_id(self) -> int:
        if self._owner_user_id is None:
            raise RuntimeError("owner_user_id обязателен для этого репозитория")
        return self._owner_user_id

    def _required_owner_clause(self, table):
        return table.c.owner_user_id == self._required_owner_user_id()
