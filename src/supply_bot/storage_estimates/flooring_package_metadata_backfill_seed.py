from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.estimates.application.backfill_flooring_package_metadata import (
    BackfillFlooringPackageMetadataUseCase,
    FlooringPackageMetadataBackfillReport,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


async def ensure_flooring_package_metadata_backfill(
    session_factory: async_sessionmaker[AsyncSession],
) -> FlooringPackageMetadataBackfillReport:
    """Idempotently backfill package metadata on global covering assemblies (PF5c6)."""

    repository = SqlAlchemyEstimateRuntimeRepository(session_factory).for_owner(None)
    return await BackfillFlooringPackageMetadataUseCase(repository).execute()


__all__ = ["ensure_flooring_package_metadata_backfill"]
