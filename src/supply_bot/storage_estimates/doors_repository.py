from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_estimates.repository import SqlAlchemyEstimateRepository, _rows_to_dicts
from supply_bot.storage_estimates.tables import (
    estimate_door_catalog,
    estimate_door_component_catalog,
    estimate_project_door_components,
    estimate_project_doors,
    estimate_rooms,
)


class SqlAlchemyEstimateDoorsRepository(SqlAlchemyEstimateRepository):
    @staticmethod
    def _estimate_door_area(width_mm: float, height_mm: float) -> float:
        return round((width_mm / 1000.0) * (height_mm / 1000.0), 4)

    async def list_estimate_door_catalog(self) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(*(column for column in estimate_door_catalog.c if column.name != "owner_user_id"))
                .where(estimate_door_catalog.c.is_active == 1, self._visible_catalog_clause(estimate_door_catalog))
                .order_by(
                    estimate_door_catalog.c.height_mm,
                    estimate_door_catalog.c.width_mm,
                    estimate_door_catalog.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_door_catalog_item(
        self,
        *,
        title: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | None = None,
        purchase_price: float | None = None,
        sale_price: float | None = None,
        install_price: float | None = None,
        note: str | None = None,
    ) -> int:
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_door_catalog).values(
                        owner_user_id=self._catalog_write_owner_value(),
                        title=title,
                        width_mm=width_mm,
                        height_mm=height_mm,
                        thickness_mm=thickness_mm,
                        area_m2=self._estimate_door_area(width_mm, height_mm),
                        purchase_price=purchase_price,
                        sale_price=sale_price,
                        install_price=install_price,
                        note=note,
                    )
                )
                return int(result.inserted_primary_key[0])

    async def list_estimate_door_component_catalog(self) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(*(column for column in estimate_door_component_catalog.c if column.name != "owner_user_id"))
                .where(
                    estimate_door_component_catalog.c.is_active == 1,
                    self._visible_catalog_clause(estimate_door_component_catalog),
                )
                .order_by(
                    estimate_door_component_catalog.c.category_code,
                    estimate_door_component_catalog.c.title,
                    estimate_door_component_catalog.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_door_component_catalog_item(
        self,
        *,
        category_code: str,
        title: str,
        unit: str = "шт",
        purchase_price: float | None = None,
        sale_price: float | None = None,
        note: str | None = None,
    ) -> int:
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_door_component_catalog).values(
                        owner_user_id=self._catalog_write_owner_value(),
                        category_code=category_code,
                        title=title,
                        unit=unit,
                        purchase_price=purchase_price,
                        sale_price=sale_price,
                        note=note,
                    )
                )
                return int(result.inserted_primary_key[0])

    async def list_estimate_project_doors(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            room_a = estimate_rooms.alias("room_a")
            room_b = estimate_rooms.alias("room_b")
            result = await session.execute(
                select(
                    estimate_project_doors.c.id,
                    estimate_project_doors.c.project_id,
                    estimate_project_doors.c.door_catalog_id,
                    estimate_project_doors.c.title,
                    estimate_project_doors.c.opening_kind,
                    estimate_project_doors.c.width_mm,
                    estimate_project_doors.c.height_mm,
                    estimate_project_doors.c.thickness_mm,
                    estimate_project_doors.c.area_m2,
                    estimate_project_doors.c.purchase_price,
                    estimate_project_doors.c.sale_price,
                    estimate_project_doors.c.install_price,
                    estimate_project_doors.c.room_a_id,
                    estimate_project_doors.c.room_b_id,
                    estimate_project_doors.c.note,
                    estimate_project_doors.c.created_at,
                    estimate_project_doors.c.updated_at,
                    estimate_door_catalog.c.title.label("catalog_title"),
                    estimate_door_catalog.c.purchase_price.label("catalog_purchase_price"),
                    estimate_door_catalog.c.sale_price.label("catalog_sale_price"),
                    estimate_door_catalog.c.install_price.label("catalog_install_price"),
                    room_a.c.name.label("room_a_name"),
                    room_b.c.name.label("room_b_name"),
                )
                .select_from(
                    estimate_project_doors.outerjoin(
                        estimate_door_catalog,
                        estimate_door_catalog.c.id == estimate_project_doors.c.door_catalog_id,
                    )
                    .outerjoin(room_a, room_a.c.id == estimate_project_doors.c.room_a_id)
                    .outerjoin(room_b, room_b.c.id == estimate_project_doors.c.room_b_id)
                )
                .where(
                    self._required_owner_clause(estimate_project_doors),
                    estimate_project_doors.c.project_id == project_id,
                )
                .order_by(estimate_project_doors.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_project_door(
        self,
        *,
        project_id: int,
        door_catalog_id: int | None,
        title: str,
        opening_kind: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | None,
        purchase_price: float | None,
        sale_price: float | None,
        install_price: float | None,
        room_a_id: int | None,
        room_b_id: int | None,
        note: str | None = None,
    ) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return 0
                room_ids = await self._owned_room_ids_for_project(session, project_id)
                result = await session.execute(
                    insert(estimate_project_doors).values(
                        owner_user_id=owner_user_id,
                        project_id=project_id,
                        door_catalog_id=door_catalog_id,
                        title=title,
                        opening_kind=opening_kind,
                        width_mm=width_mm,
                        height_mm=height_mm,
                        thickness_mm=thickness_mm,
                        area_m2=self._estimate_door_area(width_mm, height_mm),
                        purchase_price=purchase_price,
                        sale_price=sale_price,
                        install_price=install_price,
                        room_a_id=room_a_id if room_a_id in room_ids else None,
                        room_b_id=room_b_id if room_b_id in room_ids else None,
                        note=note,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return int(result.inserted_primary_key[0])

    async def update_estimate_project_door(self, door_id: int, **values: Any) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_estimate_project_id_for_project_door(session, door_id)
                if project_id is None:
                    return None
                room_ids = await self._owned_room_ids_for_project(session, project_id)
                width_mm = float(values["width_mm"])
                height_mm = float(values["height_mm"])
                await session.execute(
                    update(estimate_project_doors)
                    .where(
                        self._required_owner_clause(estimate_project_doors),
                        estimate_project_doors.c.id == door_id,
                    )
                    .values(
                        door_catalog_id=values.get("door_catalog_id"),
                        title=values["title"],
                        opening_kind=values["opening_kind"],
                        width_mm=width_mm,
                        height_mm=height_mm,
                        thickness_mm=values.get("thickness_mm"),
                        area_m2=self._estimate_door_area(width_mm, height_mm),
                        purchase_price=values.get("purchase_price"),
                        sale_price=values.get("sale_price"),
                        install_price=values.get("install_price"),
                        room_a_id=values.get("room_a_id") if values.get("room_a_id") in room_ids else None,
                        room_b_id=values.get("room_b_id") if values.get("room_b_id") in room_ids else None,
                        note=values.get("note"),
                        updated_at=func.current_timestamp(),
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def delete_estimate_project_door(self, door_id: int) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_estimate_project_id_for_project_door(session, door_id)
                if project_id is None:
                    return None
                await session.execute(
                    delete(estimate_project_door_components).where(
                        self._required_owner_clause(estimate_project_door_components),
                        estimate_project_door_components.c.project_door_id == door_id,
                    )
                )
                await session.execute(
                    delete(estimate_project_doors).where(
                        self._required_owner_clause(estimate_project_doors),
                        estimate_project_doors.c.id == door_id,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def list_estimate_project_door_components(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(
                    estimate_project_door_components.c.id,
                    estimate_project_door_components.c.project_door_id,
                    estimate_project_door_components.c.component_catalog_id,
                    estimate_project_door_components.c.category_code,
                    estimate_project_door_components.c.title,
                    estimate_project_door_components.c.unit,
                    estimate_project_door_components.c.quantity,
                    estimate_project_door_components.c.purchase_price,
                    estimate_project_door_components.c.sale_price,
                    estimate_project_door_components.c.note,
                    estimate_project_door_components.c.created_at,
                    estimate_project_door_components.c.updated_at,
                    estimate_project_doors.c.project_id,
                    estimate_door_component_catalog.c.title.label("catalog_title"),
                    estimate_door_component_catalog.c.purchase_price.label("catalog_purchase_price"),
                    estimate_door_component_catalog.c.sale_price.label("catalog_sale_price"),
                )
                .select_from(
                    estimate_project_door_components.join(
                        estimate_project_doors,
                        estimate_project_doors.c.id == estimate_project_door_components.c.project_door_id,
                    ).outerjoin(
                        estimate_door_component_catalog,
                        estimate_door_component_catalog.c.id
                        == estimate_project_door_components.c.component_catalog_id,
                    )
                )
                .where(
                    self._required_owner_clause(estimate_project_door_components),
                    self._required_owner_clause(estimate_project_doors),
                    estimate_project_doors.c.project_id == project_id,
                )
                .order_by(estimate_project_door_components.c.project_door_id, estimate_project_door_components.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_project_door_component(
        self,
        *,
        project_door_id: int,
        component_catalog_id: int | None,
        category_code: str,
        title: str,
        unit: str,
        quantity: float,
        purchase_price: float | None,
        sale_price: float | None,
        note: str | None = None,
    ) -> int | None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_estimate_project_id_for_project_door(session, project_door_id)
                if project_id is None:
                    return None
                result = await session.execute(
                    insert(estimate_project_door_components).values(
                        owner_user_id=owner_user_id,
                        project_door_id=project_door_id,
                        component_catalog_id=component_catalog_id,
                        category_code=category_code,
                        title=title,
                        unit=unit,
                        quantity=quantity,
                        purchase_price=purchase_price,
                        sale_price=sale_price,
                        note=note,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return int(result.inserted_primary_key[0])

    async def update_estimate_project_door_component(self, component_id: int, **values: Any) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_estimate_project_id_for_project_door_component(session, component_id)
                if project_id is None:
                    return None
                await session.execute(
                    update(estimate_project_door_components)
                    .where(
                        self._required_owner_clause(estimate_project_door_components),
                        estimate_project_door_components.c.id == component_id,
                    )
                    .values(
                        component_catalog_id=values.get("component_catalog_id"),
                        category_code=values["category_code"],
                        title=values["title"],
                        unit=values["unit"],
                        quantity=values["quantity"],
                        purchase_price=values.get("purchase_price"),
                        sale_price=values.get("sale_price"),
                        note=values.get("note"),
                        updated_at=func.current_timestamp(),
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def delete_estimate_project_door_component(self, component_id: int) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_estimate_project_id_for_project_door_component(session, component_id)
                if project_id is None:
                    return None
                await session.execute(
                    delete(estimate_project_door_components).where(
                        self._required_owner_clause(estimate_project_door_components),
                        estimate_project_door_components.c.id == component_id,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def get_estimate_project_id_for_project_door(self, door_id: int) -> int | None:
        async with self._session_factory() as session:
            return await self._get_estimate_project_id_for_project_door(session, door_id)

    async def _get_estimate_project_id_for_project_door(self, session, door_id: int) -> int | None:
        result = await session.execute(
            select(estimate_project_doors.c.project_id).where(
                self._required_owner_clause(estimate_project_doors),
                estimate_project_doors.c.id == door_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _get_estimate_project_id_for_project_door_component(self, session, component_id: int) -> int | None:
        result = await session.execute(
            select(estimate_project_doors.c.project_id)
            .select_from(
                estimate_project_door_components.join(
                    estimate_project_doors,
                    estimate_project_doors.c.id == estimate_project_door_components.c.project_door_id,
                )
            )
            .where(
                self._required_owner_clause(estimate_project_door_components),
                self._required_owner_clause(estimate_project_doors),
                estimate_project_door_components.c.id == component_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None
