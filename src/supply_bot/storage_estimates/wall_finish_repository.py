from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError

from supply_bot.application.errors import ConflictError
from supply_bot.storage_estimates.repository import (
    SqlAlchemyEstimateRepository,
    _bool_int,
    _float_or_none,
    _row_to_dict,
    _rows_to_dicts,
)
from supply_bot.storage_estimates.tables import (
    estimate_wall_finish_configs,
    estimate_wall_finish_coverings,
    estimate_wall_finish_layouts,
    estimate_wall_finish_preparations,
    estimate_wall_finish_room_zones,
    estimate_wall_finish_rooms,
)


class SqlAlchemyEstimateWallFinishRepository(SqlAlchemyEstimateRepository):
    async def list_estimate_wall_finish_coverings(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_wall_finish_coverings,
            estimate_wall_finish_coverings.c.title,
            estimate_wall_finish_coverings.c.id,
        )

    async def create_estimate_wall_finish_covering(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_wall_finish_coverings, values)

    async def list_estimate_wall_finish_preparations(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_wall_finish_preparations,
            estimate_wall_finish_preparations.c.title,
            estimate_wall_finish_preparations.c.id,
        )

    async def create_estimate_wall_finish_preparation(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_wall_finish_preparations, values)

    async def list_estimate_wall_finish_layouts(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_wall_finish_layouts,
            estimate_wall_finish_layouts.c.id,
        )

    async def create_estimate_wall_finish_layout(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_wall_finish_layouts, values)

    async def get_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return None
            result = await session.execute(
                select(
                    estimate_wall_finish_configs.c.project_id,
                    estimate_wall_finish_configs.c.include_preparation,
                    estimate_wall_finish_configs.c.include_demolition,
                    estimate_wall_finish_configs.c.demolition_price_per_m2,
                    estimate_wall_finish_configs.c.created_at,
                    estimate_wall_finish_configs.c.updated_at,
                ).where(
                    self._required_owner_clause(estimate_wall_finish_configs),
                    estimate_wall_finish_configs.c.project_id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def ensure_estimate_wall_finish_config(self, project_id: int) -> dict[str, Any]:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return {"project_id": project_id}
                result = await session.execute(
                    select(estimate_wall_finish_configs.c.project_id).where(
                        self._required_owner_clause(estimate_wall_finish_configs),
                        estimate_wall_finish_configs.c.project_id == project_id,
                    )
                )
                if result.scalar_one_or_none() is None:
                    await session.execute(
                        insert(estimate_wall_finish_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                        )
                    )
        return await self.get_estimate_wall_finish_config(project_id) or {"project_id": project_id}

    async def update_estimate_wall_finish_config(
        self,
        project_id: int,
        *,
        include_preparation: bool,
        include_demolition: bool,
        demolition_price_per_m2: float,
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        values = {
            "include_preparation": _bool_int(include_preparation),
            "include_demolition": _bool_int(include_demolition),
            "demolition_price_per_m2": demolition_price_per_m2,
            "updated_at": func.current_timestamp(),
        }
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                result = await session.execute(
                    update(estimate_wall_finish_configs)
                    .where(
                        self._required_owner_clause(estimate_wall_finish_configs),
                        estimate_wall_finish_configs.c.project_id == project_id,
                    )
                    .values(**values)
                )
                if not result.rowcount:
                    await session.execute(
                        insert(estimate_wall_finish_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            **values,
                        )
                    )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_wall_finish_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return await self._list_project_rows(
            estimate_wall_finish_rooms,
            project_id,
            estimate_wall_finish_rooms.c.id,
            estimate_wall_finish_rooms.c.project_id,
            estimate_wall_finish_rooms.c.room_id,
            estimate_wall_finish_rooms.c.covering_id,
            estimate_wall_finish_rooms.c.preparation_id,
            estimate_wall_finish_rooms.c.layout_id,
            estimate_wall_finish_rooms.c.area_m2_override,
            estimate_wall_finish_rooms.c.note,
            estimate_wall_finish_rooms.c.sort_order,
            estimate_wall_finish_rooms.c.created_at,
            estimate_wall_finish_rooms.c.updated_at,
        )

    async def list_estimate_wall_finish_room_zones(self, project_id: int) -> list[dict[str, Any]]:
        return await self._list_project_rows(
            estimate_wall_finish_room_zones,
            project_id,
            estimate_wall_finish_room_zones.c.id,
            estimate_wall_finish_room_zones.c.project_id,
            estimate_wall_finish_room_zones.c.room_id,
            estimate_wall_finish_room_zones.c.covering_id,
            estimate_wall_finish_room_zones.c.preparation_id,
            estimate_wall_finish_room_zones.c.layout_id,
            estimate_wall_finish_room_zones.c.area_m2,
            estimate_wall_finish_room_zones.c.note,
            estimate_wall_finish_room_zones.c.sort_order,
            estimate_wall_finish_room_zones.c.created_at,
            estimate_wall_finish_room_zones.c.updated_at,
        )

    async def replace_estimate_wall_finish_rooms(self, project_id: int, rooms: list[dict[str, Any]]) -> None:
        await self._replace_wall_finish_rows(project_id, rooms, estimate_wall_finish_rooms)

    async def replace_estimate_wall_finish_room_zones(self, project_id: int, zones: list[dict[str, Any]]) -> None:
        await self._replace_wall_finish_rows(project_id, zones, estimate_wall_finish_room_zones)

    async def _list_catalog(self, table, *order_by: Any) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(*(column for column in table.c if column.name != "owner_user_id"))
                .where(table.c.is_active == 1, self._visible_catalog_clause(table))
                .order_by(*order_by)
            )
            return _rows_to_dicts(result.fetchall())

    async def _create_catalog_item(self, table, values: dict[str, Any]) -> int:
        try:
            async with self._session_factory() as session:
                async with session.begin():
                    result = await session.execute(insert(table).values(**values))
                    return int(result.inserted_primary_key[0])
        except IntegrityError as exc:
            raise ConflictError("Catalog item with this title or code already exists") from exc

    async def _list_project_rows(self, table, project_id: int, *columns: Any) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(*columns)
                .where(
                    self._required_owner_clause(table),
                    table.c.project_id == project_id,
                )
                .order_by(table.c.sort_order, table.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def _replace_wall_finish_rows(self, project_id: int, rows: list[dict[str, Any]], table) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                room_ids = await self._owned_room_ids_for_project(session, project_id)
                await session.execute(
                    delete(table).where(
                        self._required_owner_clause(table),
                        table.c.project_id == project_id,
                    )
                )
                for index, row in enumerate(rows, start=1):
                    room_id = int(row["room_id"])
                    if room_id not in room_ids:
                        continue
                    values = {
                        "owner_user_id": owner_user_id,
                        "project_id": project_id,
                        "room_id": room_id,
                        "covering_id": row.get("covering_id"),
                        "preparation_id": row.get("preparation_id"),
                        "layout_id": row.get("layout_id"),
                        "note": row.get("note"),
                        "sort_order": index * 10,
                    }
                    if "area_m2_override" in table.c:
                        values["area_m2_override"] = _float_or_none(row.get("area_m2_override"))
                    else:
                        values["area_m2"] = _float_or_none(row.get("area_m2"))
                    await session.execute(insert(table).values(**values))
                await self._touch_estimate_project(session, project_id)
