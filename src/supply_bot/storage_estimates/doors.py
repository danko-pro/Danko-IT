from __future__ import annotations

from supply_bot.storage_estimates.door_catalog import EstimateDoorCatalogStorageMixin
from supply_bot.storage_estimates.door_common import EstimateDoorCommonStorageMixin
from supply_bot.storage_estimates.project_door_components import (
    EstimateProjectDoorComponentsStorageMixin,
)
from supply_bot.storage_estimates.project_doors import EstimateProjectDoorsStorageMixin

# Совместимый aggregate mixin для дверного estimate-среза.


class EstimateDoorsStorageMixin(
    EstimateProjectDoorComponentsStorageMixin,
    EstimateProjectDoorsStorageMixin,
    EstimateDoorCatalogStorageMixin,
    EstimateDoorCommonStorageMixin,
):
    """Стабильная точка входа для persistence дверей и комплектующих."""
