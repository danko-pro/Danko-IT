from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.estimates.application.migrate_flooring_synthetic_assemblies import (
    FlooringSyntheticMigrationReport,
    MigrateGlobalFlooringSyntheticAssembliesUseCase,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


async def ensure_global_flooring_synthetic_catalog_assemblies(
    session_factory: async_sessionmaker[AsyncSession],
) -> FlooringSyntheticMigrationReport:
    """Idempotently attach PF2 synthetic assemblies to global flat-only flooring catalog rows."""

    repository = SqlAlchemyEstimateRuntimeRepository(session_factory).for_owner(None)
    return await MigrateGlobalFlooringSyntheticAssembliesUseCase(repository).execute()


__all__ = ["ensure_global_flooring_synthetic_catalog_assemblies"]
