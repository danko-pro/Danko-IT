from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.estimates.application.flooring_snapshot import (
    DEFAULT_PUBLIC_FLOORING_SNAPSHOT,
    _crm_covering_row_from_public_defaults,
)
from supply_bot.storage_estimates.runtime_repository import SqlAlchemyEstimateRuntimeRepository


async def ensure_global_flooring_catalog_defaults(session_factory: async_sessionmaker[AsyncSession]) -> None:
    """Idempotently seed global flooring catalog rows needed by package-first public snapshots."""

    repository = SqlAlchemyEstimateRuntimeRepository(session_factory).for_owner(None)
    await _ensure_coverings(repository)
    await _ensure_preparations(repository)
    await _ensure_layouts(repository)


async def _ensure_coverings(repository: SqlAlchemyEstimateRuntimeRepository) -> None:
    existing_titles = {str(row["title"]) for row in await repository.list_estimate_flooring_coverings()}
    for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["coverings"]:
        if str(item["title"]) in existing_titles:
            continue
        await repository.create_estimate_flooring_covering(**_crm_covering_row_from_public_defaults(item))


async def _ensure_preparations(repository: SqlAlchemyEstimateRuntimeRepository) -> None:
    existing_titles = {str(row["title"]) for row in await repository.list_estimate_flooring_preparations()}
    for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["preparations"]:
        if str(item["title"]) in existing_titles:
            continue
        await repository.create_estimate_flooring_preparation(**_preparation_values_from_public_defaults(item))


async def _ensure_layouts(repository: SqlAlchemyEstimateRuntimeRepository) -> None:
    existing_titles = {str(row["title"]) for row in await repository.list_estimate_flooring_layouts()}
    for item in DEFAULT_PUBLIC_FLOORING_SNAPSHOT["layouts"]:
        if str(item["title"]) in existing_titles:
            continue
        await repository.create_estimate_flooring_layout(**_layout_values_from_public_defaults(item))


def _preparation_values_from_public_defaults(item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "title": item["title"],
        "labor_price_per_m2": item["laborPricePerM2"],
        "material_price_per_m2": item["materialPricePerM2"],
    }


def _layout_values_from_public_defaults(item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "title": item["title"],
        "labor_price_per_m2": item["laborPricePerM2"],
        "labor_multiplier": item["laborFactor"],
        "extra_waste_percent": item["additionalWastePercent"],
    }


__all__ = ["ensure_global_flooring_catalog_defaults"]
