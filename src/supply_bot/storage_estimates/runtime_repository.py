from __future__ import annotations

from supply_bot.storage_estimates.ceiling_repository import SqlAlchemyCeilingRepository
from supply_bot.storage_estimates.doors_repository import SqlAlchemyEstimateDoorsRepository
from supply_bot.storage_estimates.flooring_repository import SqlAlchemyEstimateFlooringRepository
from supply_bot.storage_estimates.plumbing_repository import SqlAlchemyPlumbingRepository
from supply_bot.storage_estimates.repository import SqlAlchemyEstimateRepository
from supply_bot.storage_estimates.wall_finish_repository import SqlAlchemyEstimateWallFinishRepository
from supply_bot.storage_estimates.warm_floor_repository import SqlAlchemyEstimateWarmFloorRepository


class SqlAlchemyEstimateRuntimeRepository(
    SqlAlchemyCeilingRepository,
    SqlAlchemyEstimateDoorsRepository,
    SqlAlchemyEstimateWallFinishRepository,
    SqlAlchemyEstimateFlooringRepository,
    SqlAlchemyEstimateWarmFloorRepository,
    SqlAlchemyPlumbingRepository,
    SqlAlchemyEstimateRepository,
):
    pass
