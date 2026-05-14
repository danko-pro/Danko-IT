from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_estimates.repository import (
    SqlAlchemyEstimateRepository,
    _bool_int,
    _float_or_none,
    _row_to_dict,
    _rows_to_dicts,
)
from supply_bot.storage_estimates.tables import (
    estimate_ceiling_catalog_items,
    estimate_ceiling_configs,
    estimate_ceiling_rooms,
    estimate_project_ceiling_items,
)


class SqlAlchemyCeilingRepository(SqlAlchemyEstimateRepository):
    async def get_estimate_ceiling_config(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return None
            result = await session.execute(
                select(
                    estimate_ceiling_configs.c.project_id,
                    estimate_ceiling_configs.c.default_package_code,
                    estimate_ceiling_configs.c.price_factor,
                    estimate_ceiling_configs.c.note,
                    estimate_ceiling_configs.c.created_at,
                    estimate_ceiling_configs.c.updated_at,
                ).where(
                    self._required_owner_clause(estimate_ceiling_configs),
                    estimate_ceiling_configs.c.project_id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def ensure_estimate_ceiling_config(self, project_id: int) -> dict[str, Any]:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return {"project_id": project_id}
                result = await session.execute(
                    select(estimate_ceiling_configs.c.project_id).where(
                        self._required_owner_clause(estimate_ceiling_configs),
                        estimate_ceiling_configs.c.project_id == project_id,
                    )
                )
                if result.scalar_one_or_none() is None:
                    await session.execute(
                        insert(estimate_ceiling_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                        )
                    )
        return await self.get_estimate_ceiling_config(project_id) or {"project_id": project_id}

    async def update_estimate_ceiling_config(
        self,
        project_id: int,
        *,
        default_package_code: str | None = None,
        price_factor: float = 1.0,
        note: str | None = None,
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        values = {
            "default_package_code": default_package_code,
            "price_factor": price_factor,
            "note": note,
            "updated_at": func.current_timestamp(),
        }
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                result = await session.execute(
                    update(estimate_ceiling_configs)
                    .where(
                        self._required_owner_clause(estimate_ceiling_configs),
                        estimate_ceiling_configs.c.project_id == project_id,
                    )
                    .values(**values)
                )
                if not result.rowcount:
                    await session.execute(
                        insert(estimate_ceiling_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            **values,
                        )
                    )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_ceiling_catalog_items(self) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    *(column for column in estimate_ceiling_catalog_items.c if column.name != "owner_user_id")
                )
                .where(
                    estimate_ceiling_catalog_items.c.is_active == 1,
                    self._visible_catalog_clause(estimate_ceiling_catalog_items),
                )
                .order_by(
                    estimate_ceiling_catalog_items.c.category,
                    estimate_ceiling_catalog_items.c.sort_order,
                    estimate_ceiling_catalog_items.c.source_code,
                    estimate_ceiling_catalog_items.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_ceiling_catalog_item(
        self,
        *,
        source_code: str,
        title: str,
        category: str,
        unit: str,
        work_price: float = 0.0,
        material_price: float = 0.0,
        equipment_price: float = 0.0,
        consumables_price: float = 0.0,
        price_factor: float = 1.0,
        quantity_source: str | None = None,
        quantity_formula: str | None = None,
        include_section: str = "ceilings",
        package_code: str | None = None,
        note: str | None = None,
        is_active: bool = True,
        sort_order: int = 100,
    ) -> int:
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_ceiling_catalog_items).values(
                        owner_user_id=self._catalog_write_owner_value(),
                        source_code=source_code,
                        title=title,
                        category=category,
                        unit=unit,
                        work_price=work_price,
                        material_price=material_price,
                        equipment_price=equipment_price,
                        consumables_price=consumables_price,
                        price_factor=price_factor,
                        quantity_source=quantity_source,
                        quantity_formula=quantity_formula,
                        include_section=include_section,
                        package_code=package_code,
                        note=note,
                        is_active=_bool_int(is_active),
                        sort_order=sort_order,
                    )
                )
                return int(result.inserted_primary_key[0])

    async def update_estimate_ceiling_catalog_item(self, item_id: int, **updates: Any) -> bool:
        blocked = {"id", "owner_user_id", "created_at", "updated_at"}
        values = {
            key: value
            for key, value in updates.items()
            if key in estimate_ceiling_catalog_items.c and key not in blocked
        }
        if "is_active" in values:
            values["is_active"] = _bool_int(bool(values["is_active"]))
        if not values:
            return False
        values["updated_at"] = func.current_timestamp()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_ceiling_catalog_items)
                    .where(
                        self._owner_clause(estimate_ceiling_catalog_items),
                        estimate_ceiling_catalog_items.c.id == item_id,
                    )
                    .values(**values)
                )
                return bool(result.rowcount)

    async def get_estimate_ceiling_catalog_item(self, item_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    *(column for column in estimate_ceiling_catalog_items.c if column.name != "owner_user_id")
                ).where(
                    self._visible_catalog_clause(estimate_ceiling_catalog_items),
                    estimate_ceiling_catalog_items.c.id == item_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def list_estimate_ceiling_rooms(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(
                    estimate_ceiling_rooms.c.id,
                    estimate_ceiling_rooms.c.project_id,
                    estimate_ceiling_rooms.c.room_id,
                    estimate_ceiling_rooms.c.default_catalog_item_id,
                    estimate_ceiling_rooms.c.is_enabled,
                    estimate_ceiling_rooms.c.ceiling_area_m2,
                    estimate_ceiling_rooms.c.area_source,
                    estimate_ceiling_rooms.c.perimeter_m,
                    estimate_ceiling_rooms.c.perimeter_source,
                    estimate_ceiling_rooms.c.package_code_snapshot,
                    estimate_ceiling_rooms.c.note,
                    estimate_ceiling_rooms.c.sort_order,
                    estimate_ceiling_rooms.c.created_at,
                    estimate_ceiling_rooms.c.updated_at,
                )
                .where(
                    self._required_owner_clause(estimate_ceiling_rooms),
                    estimate_ceiling_rooms.c.project_id == project_id,
                )
                .order_by(estimate_ceiling_rooms.c.sort_order, estimate_ceiling_rooms.c.id)
            )
            return _rows_to_dicts(result.fetchall())

    async def replace_estimate_ceiling_rooms(self, project_id: int, rooms: list[dict[str, Any]]) -> None:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                room_ids = await self._owned_room_ids_for_project(session, project_id)
                await session.execute(
                    delete(estimate_ceiling_rooms).where(
                        self._required_owner_clause(estimate_ceiling_rooms),
                        estimate_ceiling_rooms.c.project_id == project_id,
                    )
                )
                for index, room in enumerate(rooms, start=1):
                    room_id = int(room["room_id"])
                    if room_id not in room_ids:
                        continue
                    await session.execute(
                        insert(estimate_ceiling_rooms).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            room_id=room_id,
                            default_catalog_item_id=await self._visible_catalog_item_id(
                                session,
                                room.get("default_catalog_item_id"),
                            ),
                            is_enabled=_bool_int(bool(room.get("is_enabled", True))),
                            ceiling_area_m2=_float_or_none(room.get("ceiling_area_m2")),
                            area_source=str(room.get("area_source") or "room_area"),
                            perimeter_m=_float_or_none(room.get("perimeter_m")),
                            perimeter_source=str(room.get("perimeter_source") or "room_perimeter"),
                            package_code_snapshot=room.get("package_code_snapshot"),
                            note=room.get("note"),
                            sort_order=int(room.get("sort_order") or index * 10),
                        )
                    )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_project_ceiling_items(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return []
            result = await session.execute(
                select(
                    *(column for column in estimate_project_ceiling_items.c if column.name != "owner_user_id")
                )
                .where(
                    self._required_owner_clause(estimate_project_ceiling_items),
                    estimate_project_ceiling_items.c.project_id == project_id,
                )
                .order_by(
                    estimate_project_ceiling_items.c.sort_order,
                    estimate_project_ceiling_items.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def create_estimate_project_ceiling_item(self, *, project_id: int, **values: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return 0
                room_id = await self._room_id_for_project(session, project_id, values.get("room_id"))
                source_catalog_item_id = await self._visible_catalog_item_id(
                    session,
                    values.get("source_catalog_item_id"),
                )
                result = await session.execute(
                    insert(estimate_project_ceiling_items).values(
                        owner_user_id=owner_user_id,
                        project_id=project_id,
                        **self._project_item_values(
                            values,
                            room_id=room_id,
                            source_catalog_item_id=source_catalog_item_id,
                        ),
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return int(result.inserted_primary_key[0])

    async def update_estimate_project_ceiling_item(self, item_id: int, **updates: Any) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_project_id_for_ceiling_item(session, item_id)
                if project_id is None:
                    return None
                room_id = await self._room_id_for_project(session, project_id, updates.get("room_id"))
                source_catalog_item_id = await self._visible_catalog_item_id(
                    session,
                    updates.get("source_catalog_item_id"),
                )
                await session.execute(
                    update(estimate_project_ceiling_items)
                    .where(
                        self._required_owner_clause(estimate_project_ceiling_items),
                        estimate_project_ceiling_items.c.id == item_id,
                    )
                    .values(
                        **self._project_item_values(
                            updates,
                            room_id=room_id,
                            source_catalog_item_id=source_catalog_item_id,
                        ),
                        updated_at=func.current_timestamp(),
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def delete_estimate_project_ceiling_item(self, item_id: int) -> int | None:
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._get_project_id_for_ceiling_item(session, item_id)
                if project_id is None:
                    return None
                await session.execute(
                    delete(estimate_project_ceiling_items).where(
                        self._required_owner_clause(estimate_project_ceiling_items),
                        estimate_project_ceiling_items.c.id == item_id,
                    )
                )
                await self._touch_estimate_project(session, project_id)
                return project_id

    async def _visible_catalog_item_id(self, session, item_id: Any) -> int | None:
        if item_id in (None, ""):
            return None
        result = await session.execute(
            select(estimate_ceiling_catalog_items.c.id).where(
                self._visible_catalog_clause(estimate_ceiling_catalog_items),
                estimate_ceiling_catalog_items.c.id == int(item_id),
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _room_id_for_project(self, session, project_id: int, room_id: Any) -> int | None:
        if room_id in (None, ""):
            return None
        room_ids = await self._owned_room_ids_for_project(session, project_id)
        candidate = int(room_id)
        return candidate if candidate in room_ids else None

    async def _get_project_id_for_ceiling_item(self, session, item_id: int) -> int | None:
        result = await session.execute(
            select(estimate_project_ceiling_items.c.project_id).where(
                self._required_owner_clause(estimate_project_ceiling_items),
                estimate_project_ceiling_items.c.id == item_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    def _project_item_values(
        self,
        values: dict[str, Any],
        *,
        room_id: int | None,
        source_catalog_item_id: int | None,
    ) -> dict[str, Any]:
        return {
            "room_id": room_id,
            "source_catalog_item_id": source_catalog_item_id,
            "source_code_snapshot": values.get("source_code_snapshot"),
            "title_snapshot": str(values["title_snapshot"]),
            "category_snapshot": values.get("category_snapshot"),
            "unit_snapshot": str(values["unit_snapshot"]),
            "quantity": float(values.get("quantity") or 0),
            "quantity_source": str(values.get("quantity_source") or "manual"),
            "quantity_formula_snapshot": values.get("quantity_formula_snapshot"),
            "work_price_snapshot": float(values.get("work_price_snapshot") or 0),
            "material_price_snapshot": float(values.get("material_price_snapshot") or 0),
            "equipment_price_snapshot": float(values.get("equipment_price_snapshot") or 0),
            "consumables_price_snapshot": float(values.get("consumables_price_snapshot") or 0),
            "price_factor_snapshot": float(values.get("price_factor_snapshot") or 1),
            "work_total": float(values.get("work_total") or 0),
            "material_total": float(values.get("material_total") or 0),
            "equipment_total": float(values.get("equipment_total") or 0),
            "consumables_total": float(values.get("consumables_total") or 0),
            "total": float(values.get("total") or 0),
            "note_snapshot": values.get("note_snapshot"),
            "is_enabled": _bool_int(bool(values.get("is_enabled", True))),
            "sort_order": int(values.get("sort_order") or 100),
        }
