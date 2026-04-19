from __future__ import annotations

from typing import Any

# Persistence для конфигурации расчёта отделки стен.


class EstimateWallFinishConfigStorageMixin:
    async def get_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT project_id,
                       include_preparation,
                       include_demolition,
                       demolition_price_per_m2,
                       created_at,
                       updated_at
                FROM estimate_wall_finish_configs
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def ensure_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any]:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO estimate_wall_finish_configs (project_id)
                VALUES (?)
                """,
                (project_id,),
            )
            await db.commit()
        config = await self.get_estimate_wall_finish_config(project_id)
        return config or {"project_id": project_id}

    async def update_estimate_wall_finish_config(
        self,
        project_id: int,
        *,
        include_preparation: bool,
        include_demolition: bool,
        demolition_price_per_m2: float,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO estimate_wall_finish_configs (
                    project_id,
                    include_preparation,
                    include_demolition,
                    demolition_price_per_m2,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET
                    include_preparation = excluded.include_preparation,
                    include_demolition = excluded.include_demolition,
                    demolition_price_per_m2 = excluded.demolition_price_per_m2,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    1 if include_preparation else 0,
                    1 if include_demolition else 0,
                    demolition_price_per_m2,
                ),
            )
            await self._touch_estimate_project(db, project_id)
            await db.commit()
