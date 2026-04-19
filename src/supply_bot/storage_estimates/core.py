from __future__ import annotations

from supply_bot.storage_estimates.projects import EstimateProjectRecordsStorageMixin
from supply_bot.storage_estimates.room_geometry import EstimateRoomGeometryStorageMixin
from supply_bot.storage_estimates.rooms import EstimateRoomRecordsStorageMixin
from supply_bot.storage_estimates.warm_floor import EstimateWarmFloorStorageMixin

# Совместимый aggregate mixin для базового estimate-среза.


class EstimateCoreStorageMixin(
    EstimateRoomGeometryStorageMixin,
    EstimateWarmFloorStorageMixin,
    EstimateRoomRecordsStorageMixin,
    EstimateProjectRecordsStorageMixin,
):
    """Стабильная точка входа для estimate core persistence."""
