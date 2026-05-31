from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.estimates.application.warm_floor_snapshot import DEFAULT_PUBLIC_WARM_FLOOR_CONFIG
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


async def ensure_global_warm_floor_defaults(session_factory: async_sessionmaker[AsyncSession]) -> None:
    repository = SqlAlchemyEstimateRuntimeRepository(session_factory).for_owner(None)
    await repository.ensure_public_warm_floor_config(DEFAULT_PUBLIC_WARM_FLOOR_CONFIG)


__all__ = ["ensure_global_warm_floor_defaults"]
