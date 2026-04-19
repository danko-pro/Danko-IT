from __future__ import annotations

from supply_bot.storage_estimates.project_touch import EstimateProjectTouchStorageMixin
from supply_bot.storage_estimates.wall_finish_catalog import EstimateWallFinishCatalogStorageMixin
from supply_bot.storage_estimates.wall_finish_config import EstimateWallFinishConfigStorageMixin
from supply_bot.storage_estimates.wall_finish_rooms import EstimateWallFinishRoomsStorageMixin

# Совместимый aggregate mixin для wall finish persistence-среза.


class EstimateWallFinishStorageMixin(
    EstimateWallFinishRoomsStorageMixin,
    EstimateWallFinishCatalogStorageMixin,
    EstimateWallFinishConfigStorageMixin,
    EstimateProjectTouchStorageMixin,
):
    """Стабильная точка входа для persistence отделки стен."""
