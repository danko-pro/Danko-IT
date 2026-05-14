"""
Слой persistence для калькулятора смет.
Пакет группирует mixin-модули по подзонам estimates, чтобы корень supply_bot не был забит flat storage-файлами.
"""

from supply_bot.storage_estimates.ceiling_repository import SqlAlchemyCeilingRepository
from supply_bot.storage_estimates.core import EstimateCoreStorageMixin
from supply_bot.storage_estimates.doors import EstimateDoorsStorageMixin
from supply_bot.storage_estimates.flooring import EstimateFlooringStorageMixin
from supply_bot.storage_estimates.wall_finish import EstimateWallFinishStorageMixin

__all__ = [
    "EstimateCoreStorageMixin",
    "EstimateDoorsStorageMixin",
    "EstimateFlooringStorageMixin",
    "EstimateWallFinishStorageMixin",
    "SqlAlchemyCeilingRepository",
]
