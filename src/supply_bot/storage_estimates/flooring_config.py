from __future__ import annotations

from typing import Any

# Persistence для конфигурации расчёта напольных покрытий.


class EstimateFlooringConfigStorageMixin:
    async def get_estimate_flooring_config(self, project_id: int) -> dict[str, Any] | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT project_id,
                       include_underlay,
                       include_plinth,
                       include_demolition,
                       include_preparation,
                       demolition_price_per_m2,
                       underlay_price_per_m2,
                       plinth_material_price_per_m,
                       plinth_install_price_per_m,
                       threshold_profile_count,
                       threshold_profile_price,
                       created_at,
                       updated_at
                FROM estimate_flooring_configs
                WHERE project_id = ?
                """,
                (project_id,),
            )
            row = await cursor.fetchone()
        return dict(row) if row else None

    async def ensure_estimate_flooring_config(self, project_id: int) -> dict[str, Any]:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO estimate_flooring_configs (project_id)
                VALUES (?)
                """,
                (project_id,),
            )
            await db.commit()
        config = await self.get_estimate_flooring_config(project_id)
        return config or {"project_id": project_id}

    async def update_estimate_flooring_config(
        self,
        project_id: int,
        *,
        include_underlay: bool,
        include_plinth: bool,
        include_demolition: bool,
        include_preparation: bool,
        demolition_price_per_m2: float,
        underlay_price_per_m2: float,
        plinth_material_price_per_m: float,
        plinth_install_price_per_m: float,
        threshold_profile_count: int,
        threshold_profile_price: float,
    ) -> None:
        async with self.connection() as db:
            await db.execute(
                """
                INSERT INTO estimate_flooring_configs (
                    project_id,
                    include_underlay,
                    include_plinth,
                    include_demolition,
                    include_preparation,
                    demolition_price_per_m2,
                    underlay_price_per_m2,
                    plinth_material_price_per_m,
                    plinth_install_price_per_m,
                    threshold_profile_count,
                    threshold_profile_price,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id) DO UPDATE SET
                    include_underlay = excluded.include_underlay,
                    include_plinth = excluded.include_plinth,
                    include_demolition = excluded.include_demolition,
                    include_preparation = excluded.include_preparation,
                    demolition_price_per_m2 = excluded.demolition_price_per_m2,
                    underlay_price_per_m2 = excluded.underlay_price_per_m2,
                    plinth_material_price_per_m = excluded.plinth_material_price_per_m,
                    plinth_install_price_per_m = excluded.plinth_install_price_per_m,
                    threshold_profile_count = excluded.threshold_profile_count,
                    threshold_profile_price = excluded.threshold_profile_price,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    1 if include_underlay else 0,
                    1 if include_plinth else 0,
                    1 if include_demolition else 0,
                    1 if include_preparation else 0,
                    demolition_price_per_m2,
                    underlay_price_per_m2,
                    plinth_material_price_per_m,
                    plinth_install_price_per_m,
                    threshold_profile_count,
                    threshold_profile_price,
                ),
            )
            await self._touch_estimate_project(db, project_id)
            await db.commit()
