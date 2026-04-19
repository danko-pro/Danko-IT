from __future__ import annotations

from supply_bot.storage_estimates.flooring_catalog import EstimateFlooringCatalogStorageMixin
from supply_bot.storage_estimates.flooring_config import EstimateFlooringConfigStorageMixin
from supply_bot.storage_estimates.flooring_rooms import EstimateFlooringRoomsStorageMixin
from supply_bot.storage_estimates.project_touch import EstimateProjectTouchStorageMixin

# Совместимый aggregate mixin для flooring persistence-среза.


class EstimateFlooringStorageMixin(
    EstimateFlooringRoomsStorageMixin,
    EstimateFlooringCatalogStorageMixin,
    EstimateFlooringConfigStorageMixin,
    EstimateProjectTouchStorageMixin,
):
    """Стабильная точка входа для persistence напольных покрытий."""
