from __future__ import annotations

from typing import Any

from supply_bot.storage_estimates.project_touch import EstimateProjectTouchStorageMixin

# Внутренние helper-методы для дверного persistence-среза estimates.


class EstimateDoorCommonStorageMixin(EstimateProjectTouchStorageMixin):
    @staticmethod
    def _estimate_door_area(width_mm: float, height_mm: float) -> float:
        return round((width_mm / 1000.0) * (height_mm / 1000.0), 4)

    async def _get_estimate_project_id_for_project_door(self, db: Any, door_id: int) -> int | None:
        cursor = await db.execute(
            "SELECT project_id FROM estimate_project_doors WHERE id = ?",
            (door_id,),
        )
        row = await cursor.fetchone()
        return int(row["project_id"]) if row else None

    async def _get_estimate_project_id_for_project_door_component(
        self,
        db: Any,
        component_id: int,
    ) -> int | None:
        cursor = await db.execute(
            """
            SELECT epd.project_id
            FROM estimate_project_door_components epdc
            INNER JOIN estimate_project_doors epd ON epd.id = epdc.project_door_id
            WHERE epdc.id = ?
            """,
            (component_id,),
        )
        row = await cursor.fetchone()
        return int(row["project_id"]) if row else None
