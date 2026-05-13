from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, delete, func, insert, select, update

from supply_bot.storage_estimates.tables import (
    estimate_flooring_room_zones,
    estimate_flooring_rooms,
    estimate_project_doors,
    estimate_projects,
    estimate_room_floor_sections,
    estimate_room_openings,
    estimate_room_walls,
    estimate_rooms,
    estimate_wall_finish_room_zones,
    estimate_wall_finish_rooms,
    estimate_warm_floor_rooms,
)
from supply_bot.storage_scope import RequiredOwnerScopedSqlAlchemyRepository

_ESTIMATE_PROJECT_COLUMNS = (
    estimate_projects.c.id,
    estimate_projects.c.name,
    estimate_projects.c.residential_complex,
    estimate_projects.c.address,
    estimate_projects.c.entrance_section,
    estimate_projects.c.apartment,
    estimate_projects.c.floor,
    estimate_projects.c.has_elevator,
    estimate_projects.c.lift_type,
    estimate_projects.c.site_access,
    estimate_projects.c.intercom_code,
    estimate_projects.c.loading_zone,
    estimate_projects.c.responsible_person,
    estimate_projects.c.note,
    estimate_projects.c.group_chat_id,
    estimate_projects.c.created_at,
    estimate_projects.c.updated_at,
)

_ESTIMATE_ROOM_COLUMNS = (
    estimate_rooms.c.id,
    estimate_rooms.c.project_id,
    estimate_rooms.c.name,
    estimate_rooms.c.ceiling_height_m,
    estimate_rooms.c.manual_floor_area_m2,
    estimate_rooms.c.auto_perimeter_calc,
    estimate_rooms.c.perimeter_factor,
    estimate_rooms.c.note,
    estimate_rooms.c.sort_order,
    estimate_rooms.c.created_at,
    estimate_rooms.c.updated_at,
)


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    return value


def _row_to_dict(row: Any | None) -> dict[str, Any] | None:
    if row is None:
        return None
    mapping = row._mapping if hasattr(row, "_mapping") else row
    return {key: _serialize_value(value) for key, value in mapping.items()}


def _rows_to_dicts(rows: list[Any]) -> list[dict[str, Any]]:
    return [row_dict for row in rows if (row_dict := _row_to_dict(row)) is not None]


def _float_or_none(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def _bool_int(value: bool) -> int:
    return 1 if value else 0


class SqlAlchemyEstimateRepository(RequiredOwnerScopedSqlAlchemyRepository):
    def _visible_catalog_clause(self, table) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return (table.c.owner_user_id.is_(None)) | (table.c.owner_user_id == self._owner_user_id)

    def _catalog_write_owner_value(self) -> int | None:
        return self._owner_user_id

    async def _owned_estimate_project_id(self, session, project_id: int) -> int | None:
        self._required_owner_user_id()
        result = await session.execute(
            select(estimate_projects.c.id).where(
                self._required_owner_clause(estimate_projects),
                estimate_projects.c.id == project_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _owned_room_project_id(self, session, room_id: int) -> int | None:
        self._required_owner_user_id()
        result = await session.execute(
            select(estimate_rooms.c.project_id).where(
                self._required_owner_clause(estimate_rooms),
                estimate_rooms.c.id == room_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _owned_room_ids_for_project(self, session, project_id: int) -> set[int]:
        self._required_owner_user_id()
        result = await session.execute(
            select(estimate_rooms.c.id).where(
                self._required_owner_clause(estimate_rooms),
                estimate_rooms.c.project_id == project_id,
            )
        )
        return {int(value) for value in result.scalars().all()}

    async def _touch_estimate_project(self, session, project_id: int) -> None:
        self._required_owner_user_id()
        await session.execute(
            update(estimate_projects)
            .where(
                self._required_owner_clause(estimate_projects),
                estimate_projects.c.id == project_id,
            )
            .values(updated_at=func.current_timestamp())
        )

    async def list_estimate_projects(self) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    *_ESTIMATE_PROJECT_COLUMNS,
                    func.count(estimate_rooms.c.id).label("rooms_count"),
                )
                .select_from(
                    estimate_projects.outerjoin(
                        estimate_rooms,
                        and_(
                            estimate_rooms.c.project_id == estimate_projects.c.id,
                            self._required_owner_clause(estimate_rooms),
                        ),
                    )
                )
                .where(self._required_owner_clause(estimate_projects))
                .group_by(*_ESTIMATE_PROJECT_COLUMNS)
                .order_by(estimate_projects.c.updated_at.desc(), estimate_projects.c.id.desc())
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_project(
        self,
        *,
        name: str,
        note: str | None = None,
        group_chat_id: int | None = None,
    ) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_projects).values(
                        owner_user_id=owner_user_id,
                        name=name,
                        note=note,
                        group_chat_id=group_chat_id,
                    )
                )
                return int(result.inserted_primary_key[0])

    async def get_estimate_project(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(*_ESTIMATE_PROJECT_COLUMNS).where(
                    self._required_owner_clause(estimate_projects),
                    estimate_projects.c.id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def update_estimate_project(self, project_id: int, **updates: Any) -> bool:
        self._required_owner_user_id()
        blocked = {"id", "owner_user_id", "created_at", "updated_at", "rooms_count"}
        values = {key: value for key, value in updates.items() if key in estimate_projects.c and key not in blocked}
        if not values:
            return False
        values["updated_at"] = func.current_timestamp()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_projects)
                    .where(
                        self._required_owner_clause(estimate_projects),
                        estimate_projects.c.id == project_id,
                    )
                    .values(**values)
                )
                return bool(result.rowcount)

    async def touch_estimate_project(self, project_id: int) -> None:
        async with self._session_factory() as session:
            async with session.begin():
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_rooms(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(*_ESTIMATE_ROOM_COLUMNS)
                .where(
                    self._required_owner_clause(estimate_rooms),
                    estimate_rooms.c.project_id == project_id,
                )
                .order_by(estimate_rooms.c.sort_order, estimate_rooms.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_room(
        self,
        *,
        project_id: int,
        name: str,
        ceiling_height_m: float = 2.7,
        auto_perimeter_calc: bool = False,
        perimeter_factor: float = 1.15,
    ) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return 0
                max_sort_order = (
                    await session.execute(
                        select(func.coalesce(func.max(estimate_rooms.c.sort_order), 0)).where(
                            self._required_owner_clause(estimate_rooms),
                            estimate_rooms.c.project_id == project_id,
                        )
                    )
                ).scalar_one()
                result = await session.execute(
                    insert(estimate_rooms).values(
                        owner_user_id=owner_user_id,
                        project_id=project_id,
                        name=name,
                        ceiling_height_m=ceiling_height_m,
                        auto_perimeter_calc=_bool_int(auto_perimeter_calc),
                        perimeter_factor=perimeter_factor,
                        sort_order=int(max_sort_order or 0) + 10,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return int(result.inserted_primary_key[0])

    async def get_estimate_room(self, room_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(*_ESTIMATE_ROOM_COLUMNS).where(
                    self._required_owner_clause(estimate_rooms),
                    estimate_rooms.c.id == room_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def update_estimate_room(
        self,
        room_id: int,
        *,
        name: str,
        ceiling_height_m: float,
        manual_floor_area_m2: float | None,
        auto_perimeter_calc: bool,
        perimeter_factor: float,
        note: str | None,
    ) -> None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._owned_room_project_id(session, room_id)
                if project_id is None:
                    return
                await session.execute(
                    update(estimate_rooms)
                    .where(
                        self._required_owner_clause(estimate_rooms),
                        estimate_rooms.c.id == room_id,
                    )
                    .values(
                        name=name,
                        ceiling_height_m=ceiling_height_m,
                        manual_floor_area_m2=manual_floor_area_m2,
                        auto_perimeter_calc=_bool_int(auto_perimeter_calc),
                        perimeter_factor=perimeter_factor,
                        note=note,
                        updated_at=func.current_timestamp(),
                    )
                )
                await self._touch_estimate_project(session, project_id)

    async def delete_estimate_room(self, room_id: int) -> None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._owned_room_project_id(session, room_id)
                if project_id is None:
                    return
                for table in (
                    estimate_room_walls,
                    estimate_room_floor_sections,
                    estimate_room_openings,
                    estimate_warm_floor_rooms,
                    estimate_flooring_rooms,
                    estimate_flooring_room_zones,
                    estimate_wall_finish_rooms,
                    estimate_wall_finish_room_zones,
                ):
                    await session.execute(
                        delete(table).where(
                            self._required_owner_clause(table),
                            table.c.room_id == room_id,
                        )
                    )
                await session.execute(
                    update(estimate_project_doors)
                    .where(
                        self._required_owner_clause(estimate_project_doors),
                        estimate_project_doors.c.room_a_id == room_id,
                    )
                    .values(room_a_id=None, updated_at=func.current_timestamp())
                )
                await session.execute(
                    update(estimate_project_doors)
                    .where(
                        self._required_owner_clause(estimate_project_doors),
                        estimate_project_doors.c.room_b_id == room_id,
                    )
                    .values(room_b_id=None, updated_at=func.current_timestamp())
                )
                await session.execute(
                    delete(estimate_rooms).where(
                        self._required_owner_clause(estimate_rooms),
                        estimate_rooms.c.id == room_id,
                    )
                )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_room_walls(self, room_id: int) -> list[dict[str, Any]]:
        return await self._list_room_geometry(
            estimate_room_walls,
            room_id,
            estimate_room_walls.c.id,
            estimate_room_walls.c.room_id,
            estimate_room_walls.c.length_m,
            estimate_room_walls.c.sort_order,
        )

    async def list_estimate_room_floor_sections(self, room_id: int) -> list[dict[str, Any]]:
        return await self._list_room_geometry(
            estimate_room_floor_sections,
            room_id,
            estimate_room_floor_sections.c.id,
            estimate_room_floor_sections.c.room_id,
            estimate_room_floor_sections.c.length_m,
            estimate_room_floor_sections.c.width_m,
            estimate_room_floor_sections.c.sort_order,
        )

    async def list_estimate_room_openings(self, room_id: int) -> list[dict[str, Any]]:
        return await self._list_room_geometry(
            estimate_room_openings,
            room_id,
            estimate_room_openings.c.id,
            estimate_room_openings.c.room_id,
            estimate_room_openings.c.opening_type,
            estimate_room_openings.c.width_m,
            estimate_room_openings.c.height_m,
            estimate_room_openings.c.quantity,
            estimate_room_openings.c.area_m2,
            estimate_room_openings.c.note,
            estimate_room_openings.c.sort_order,
        )

    async def _list_room_geometry(self, table, room_id: int, *columns: Any) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_room_project_id(session, room_id) is None:
                return []
            result = await session.execute(
                select(*columns)
                .where(
                    self._required_owner_clause(table),
                    table.c.room_id == room_id,
                )
                .order_by(table.c.sort_order, table.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def replace_estimate_room_walls(self, room_id: int, lengths_m: list[float]) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._owned_room_project_id(session, room_id)
                if project_id is None:
                    return
                await session.execute(
                    delete(estimate_room_walls).where(
                        self._required_owner_clause(estimate_room_walls),
                        estimate_room_walls.c.room_id == room_id,
                    )
                )
                for index, length_m in enumerate(lengths_m, start=1):
                    if length_m <= 0:
                        continue
                    await session.execute(
                        insert(estimate_room_walls).values(
                            owner_user_id=owner_user_id,
                            room_id=room_id,
                            length_m=float(length_m),
                            sort_order=index * 10,
                        )
                    )
                await self._touch_room_and_project(session, room_id, project_id)

    async def replace_estimate_room_floor_sections(
        self,
        room_id: int,
        sections: list[dict[str, float]],
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._owned_room_project_id(session, room_id)
                if project_id is None:
                    return
                await session.execute(
                    delete(estimate_room_floor_sections).where(
                        self._required_owner_clause(estimate_room_floor_sections),
                        estimate_room_floor_sections.c.room_id == room_id,
                    )
                )
                for index, section in enumerate(sections, start=1):
                    length_m = float(section.get("length_m") or 0)
                    width_m = float(section.get("width_m") or 0)
                    if length_m <= 0 or width_m <= 0:
                        continue
                    await session.execute(
                        insert(estimate_room_floor_sections).values(
                            owner_user_id=owner_user_id,
                            room_id=room_id,
                            length_m=length_m,
                            width_m=width_m,
                            sort_order=index * 10,
                        )
                    )
                await self._touch_room_and_project(session, room_id, project_id)

    async def replace_estimate_room_openings(
        self,
        room_id: int,
        openings: list[dict[str, Any]],
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._owned_room_project_id(session, room_id)
                if project_id is None:
                    return
                await session.execute(
                    delete(estimate_room_openings).where(
                        self._required_owner_clause(estimate_room_openings),
                        estimate_room_openings.c.room_id == room_id,
                    )
                )
                for index, opening in enumerate(openings, start=1):
                    width_value = _float_or_none(opening.get("width_m"))
                    height_value = _float_or_none(opening.get("height_m"))
                    quantity_value = _float_or_none(opening.get("quantity"))
                    area_value = _float_or_none(opening.get("area_m2"))
                    if area_value is None and (width_value is None or height_value is None):
                        continue
                    await session.execute(
                        insert(estimate_room_openings).values(
                            owner_user_id=owner_user_id,
                            room_id=room_id,
                            opening_type=str(opening.get("opening_type") or "window"),
                            width_m=max(0.0, width_value) if width_value is not None else None,
                            height_m=max(0.0, height_value) if height_value is not None else None,
                            quantity=max(0.0, quantity_value) if quantity_value is not None else 1.0,
                            area_m2=max(0.0, area_value) if area_value is not None else None,
                            note=opening.get("note"),
                            sort_order=index * 10,
                        )
                    )
                await self._touch_room_and_project(session, room_id, project_id)

    async def _touch_room_and_project(self, session, room_id: int, project_id: int) -> None:
        await session.execute(
            update(estimate_rooms)
            .where(
                self._required_owner_clause(estimate_rooms),
                estimate_rooms.c.id == room_id,
            )
            .values(updated_at=func.current_timestamp())
        )
        await self._touch_estimate_project(session, project_id)
