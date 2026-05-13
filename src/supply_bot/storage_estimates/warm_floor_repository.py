from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_estimates.repository import (
    SqlAlchemyEstimateRepository,
    _float_or_none,
    _row_to_dict,
    _rows_to_dicts,
)
from supply_bot.storage_estimates.tables import (
    estimate_warm_floor_configs,
    estimate_warm_floor_rooms,
)

_WARM_FLOOR_CONFIG_COLUMNS = (
    estimate_warm_floor_configs.c.project_id,
    estimate_warm_floor_configs.c.work_price_per_m2,
    estimate_warm_floor_configs.c.pipe_m_per_m2,
    estimate_warm_floor_configs.c.max_contour_area_m2,
    estimate_warm_floor_configs.c.small_zone_area_m2,
    estimate_warm_floor_configs.c.manifold_work_price,
    estimate_warm_floor_configs.c.manifold_material_price,
    estimate_warm_floor_configs.c.pump_work_price,
    estimate_warm_floor_configs.c.pump_material_price,
    estimate_warm_floor_configs.c.pipe_price_per_m,
    estimate_warm_floor_configs.c.pipe_material_title,
    estimate_warm_floor_configs.c.manifold_material_items_json,
    estimate_warm_floor_configs.c.pump_material_items_json,
    estimate_warm_floor_configs.c.consumable_material_items_json,
    estimate_warm_floor_configs.c.pump_rooms_threshold,
    estimate_warm_floor_configs.c.pump_contours_threshold,
    estimate_warm_floor_configs.c.created_at,
    estimate_warm_floor_configs.c.updated_at,
)


class SqlAlchemyEstimateWarmFloorRepository(SqlAlchemyEstimateRepository):
    async def get_estimate_warm_floor_config(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return None
            result = await session.execute(
                select(*_WARM_FLOOR_CONFIG_COLUMNS).where(
                    self._required_owner_clause(estimate_warm_floor_configs),
                    estimate_warm_floor_configs.c.project_id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def ensure_estimate_warm_floor_config(self, project_id: int) -> dict[str, Any]:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return {"project_id": project_id}
                result = await session.execute(
                    select(estimate_warm_floor_configs.c.project_id).where(
                        self._required_owner_clause(estimate_warm_floor_configs),
                        estimate_warm_floor_configs.c.project_id == project_id,
                    )
                )
                if result.scalar_one_or_none() is None:
                    await session.execute(
                        insert(estimate_warm_floor_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                        )
                    )
        return await self.get_estimate_warm_floor_config(project_id) or {"project_id": project_id}

    async def update_estimate_warm_floor_config(
        self,
        project_id: int,
        *,
        work_price_per_m2: float,
        pipe_m_per_m2: float,
        max_contour_area_m2: float,
        small_zone_area_m2: float,
        manifold_work_price: float,
        manifold_material_price: float,
        pump_work_price: float,
        pump_material_price: float,
        pipe_price_per_m: float,
        pipe_material_title: str,
        manifold_material_items_json: str,
        pump_material_items_json: str,
        consumable_material_items_json: str,
        pump_rooms_threshold: int,
        pump_contours_threshold: int,
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        values = {
            "work_price_per_m2": work_price_per_m2,
            "pipe_m_per_m2": pipe_m_per_m2,
            "max_contour_area_m2": max_contour_area_m2,
            "small_zone_area_m2": small_zone_area_m2,
            "manifold_work_price": manifold_work_price,
            "manifold_material_price": manifold_material_price,
            "pump_work_price": pump_work_price,
            "pump_material_price": pump_material_price,
            "pipe_price_per_m": pipe_price_per_m,
            "pipe_material_title": pipe_material_title,
            "manifold_material_items_json": manifold_material_items_json,
            "pump_material_items_json": pump_material_items_json,
            "consumable_material_items_json": consumable_material_items_json,
            "pump_rooms_threshold": pump_rooms_threshold,
            "pump_contours_threshold": pump_contours_threshold,
            "updated_at": func.current_timestamp(),
        }
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                result = await session.execute(
                    update(estimate_warm_floor_configs)
                    .where(
                        self._required_owner_clause(estimate_warm_floor_configs),
                        estimate_warm_floor_configs.c.project_id == project_id,
                    )
                    .values(**values)
                )
                if not result.rowcount:
                    await session.execute(
                        insert(estimate_warm_floor_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            **values,
                        )
                    )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_warm_floor_rooms(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(
                    estimate_warm_floor_rooms.c.id,
                    estimate_warm_floor_rooms.c.project_id,
                    estimate_warm_floor_rooms.c.room_id,
                    estimate_warm_floor_rooms.c.area_m2_override,
                    estimate_warm_floor_rooms.c.note,
                    estimate_warm_floor_rooms.c.sort_order,
                    estimate_warm_floor_rooms.c.updated_at,
                )
                .where(
                    self._required_owner_clause(estimate_warm_floor_rooms),
                    estimate_warm_floor_rooms.c.project_id == project_id,
                )
                .order_by(estimate_warm_floor_rooms.c.sort_order, estimate_warm_floor_rooms.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def replace_estimate_warm_floor_rooms(
        self,
        project_id: int,
        rows: list[dict[str, Any]],
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                room_ids = await self._owned_room_ids_for_project(session, project_id)
                await session.execute(
                    delete(estimate_warm_floor_rooms).where(
                        self._required_owner_clause(estimate_warm_floor_rooms),
                        estimate_warm_floor_rooms.c.project_id == project_id,
                    )
                )
                for index, row in enumerate(rows, start=1):
                    room_id = int(row["room_id"])
                    if room_id not in room_ids:
                        continue
                    await session.execute(
                        insert(estimate_warm_floor_rooms).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            room_id=room_id,
                            area_m2_override=_float_or_none(row.get("area_m2_override")),
                            note=row.get("note"),
                            sort_order=index * 10,
                        )
                    )
                await self._touch_estimate_project(session, project_id)
