from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, insert, select, update
from sqlalchemy.exc import IntegrityError

from supply_bot.application.errors import ConflictError
from supply_bot.estimates.application.flooring_catalog_assembly import (
    validate_flooring_catalog_assembly_target_kind,
)
from supply_bot.storage_estimates.repository import (
    SqlAlchemyEstimateRepository,
    _bool_int,
    _float_or_none,
    _row_to_dict,
    _rows_to_dicts,
)
from supply_bot.storage_estimates.tables import (
    estimate_flooring_catalog_assemblies,
    estimate_flooring_catalog_assembly_rows,
    estimate_flooring_configs,
    estimate_flooring_assembly_items,
    estimate_flooring_coverings,
    estimate_flooring_layouts,
    estimate_flooring_preparations,
    estimate_flooring_room_zones,
    estimate_flooring_rooms,
)


class SqlAlchemyEstimateFlooringRepository(SqlAlchemyEstimateRepository):
    async def list_estimate_flooring_assembly_items(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_flooring_assembly_items,
            estimate_flooring_assembly_items.c.section,
            estimate_flooring_assembly_items.c.sort_order,
            estimate_flooring_assembly_items.c.title,
            estimate_flooring_assembly_items.c.id,
        )

    async def create_estimate_flooring_assembly_item(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_flooring_assembly_items, values)

    async def get_estimate_flooring_assembly_item(self, item_id: int) -> dict[str, Any] | None:
        return await self._get_global_catalog_item(estimate_flooring_assembly_items, item_id)

    async def update_estimate_flooring_assembly_item(self, item_id: int, **values: Any) -> bool:
        return await self._update_global_catalog_item(estimate_flooring_assembly_items, item_id, values)

    async def delete_estimate_flooring_assembly_item(self, item_id: int) -> bool:
        return await self._delete_global_catalog_item(estimate_flooring_assembly_items, item_id)

    async def list_estimate_flooring_coverings(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_flooring_coverings,
            estimate_flooring_coverings.c.title,
            estimate_flooring_coverings.c.id,
        )

    async def create_estimate_flooring_covering(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        values["needs_plinth"] = _bool_int(bool(values.get("needs_plinth")))
        return await self._create_catalog_item(estimate_flooring_coverings, values)

    async def get_estimate_flooring_covering(self, covering_id: int) -> dict[str, Any] | None:
        return await self._get_global_catalog_item(estimate_flooring_coverings, covering_id)

    async def update_estimate_flooring_covering(self, covering_id: int, **values: Any) -> bool:
        if "needs_plinth" in values:
            values["needs_plinth"] = _bool_int(bool(values["needs_plinth"]))
        return await self._update_global_catalog_item(estimate_flooring_coverings, covering_id, values)

    async def delete_estimate_flooring_covering(self, covering_id: int) -> bool:
        return await self._delete_global_catalog_item(estimate_flooring_coverings, covering_id)

    async def list_estimate_flooring_preparations(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_flooring_preparations,
            estimate_flooring_preparations.c.title,
            estimate_flooring_preparations.c.id,
        )

    async def create_estimate_flooring_preparation(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_flooring_preparations, values)

    async def get_estimate_flooring_preparation(self, preparation_id: int) -> dict[str, Any] | None:
        return await self._get_global_catalog_item(estimate_flooring_preparations, preparation_id)

    async def update_estimate_flooring_preparation(self, preparation_id: int, **values: Any) -> bool:
        return await self._update_global_catalog_item(estimate_flooring_preparations, preparation_id, values)

    async def delete_estimate_flooring_preparation(self, preparation_id: int) -> bool:
        return await self._delete_global_catalog_item(estimate_flooring_preparations, preparation_id)

    async def list_estimate_flooring_layouts(self) -> list[dict[str, Any]]:
        return await self._list_catalog(
            estimate_flooring_layouts,
            estimate_flooring_layouts.c.id,
        )

    async def create_estimate_flooring_layout(self, **values: Any) -> int:
        values["owner_user_id"] = self._catalog_write_owner_value()
        return await self._create_catalog_item(estimate_flooring_layouts, values)

    async def get_estimate_flooring_layout(self, layout_id: int) -> dict[str, Any] | None:
        return await self._get_global_catalog_item(estimate_flooring_layouts, layout_id)

    async def update_estimate_flooring_layout(self, layout_id: int, **values: Any) -> bool:
        return await self._update_global_catalog_item(estimate_flooring_layouts, layout_id, values)

    async def delete_estimate_flooring_layout(self, layout_id: int) -> bool:
        return await self._delete_global_catalog_item(estimate_flooring_layouts, layout_id)

    async def get_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None:
        target_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
        async with self._session_factory() as session:
            assembly = await self._fetch_visible_catalog_assembly(session, target_kind, target_id)
            if assembly is None:
                return None
            rows_result = await session.execute(
                select(
                    *(
                        column
                        for column in estimate_flooring_catalog_assembly_rows.c
                        if column.name not in {"assembly_id", "created_at", "updated_at"}
                    )
                )
                .where(estimate_flooring_catalog_assembly_rows.c.assembly_id == assembly["id"])
                .order_by(
                    estimate_flooring_catalog_assembly_rows.c.sort_order,
                    estimate_flooring_catalog_assembly_rows.c.id,
                )
            )
            assembly["rows"] = _rows_to_dicts(rows_result.fetchall())
            return assembly

    async def replace_estimate_flooring_catalog_assembly(
        self,
        target_kind: str,
        target_id: int,
        title: str,
        rows: list[dict[str, Any]],
        *,
        version: str = "flooring-assembly-v1",
    ) -> int:
        target_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
        owner_value = self._catalog_write_owner_value()
        async with self._session_factory() as session:
            async with session.begin():
                assembly_id = await self._upsert_catalog_assembly(
                    session,
                    target_kind=target_kind,
                    target_id=target_id,
                    title=title,
                    version=version,
                    owner_user_id=owner_value,
                )
                await session.execute(
                    delete(estimate_flooring_catalog_assembly_rows).where(
                        estimate_flooring_catalog_assembly_rows.c.assembly_id == assembly_id,
                    )
                )
                for index, row in enumerate(rows, start=1):
                    await session.execute(
                        insert(estimate_flooring_catalog_assembly_rows).values(
                            assembly_id=assembly_id,
                            **self._catalog_assembly_row_values(row, index=index),
                        )
                    )
                return assembly_id

    async def delete_estimate_flooring_catalog_assembly(self, target_kind: str, target_id: int) -> bool:
        target_kind = validate_flooring_catalog_assembly_target_kind(target_kind)
        async with self._session_factory() as session:
            async with session.begin():
                assembly_id = await self._writable_catalog_assembly_id(session, target_kind, target_id)
                if assembly_id is None:
                    return False
                result = await session.execute(
                    delete(estimate_flooring_catalog_assemblies).where(
                        estimate_flooring_catalog_assemblies.c.id == assembly_id,
                    )
                )
                return bool(result.rowcount)

    async def get_estimate_flooring_config(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            if await self._owned_estimate_project_id(session, project_id) is None:
                return None
            result = await session.execute(
                select(
                    estimate_flooring_configs.c.project_id,
                    estimate_flooring_configs.c.include_underlay,
                    estimate_flooring_configs.c.include_plinth,
                    estimate_flooring_configs.c.include_demolition,
                    estimate_flooring_configs.c.include_preparation,
                    estimate_flooring_configs.c.default_preparation_id,
                    estimate_flooring_configs.c.demolition_price_per_m2,
                    estimate_flooring_configs.c.underlay_price_per_m2,
                    estimate_flooring_configs.c.plinth_material_price_per_m,
                    estimate_flooring_configs.c.plinth_install_price_per_m,
                    estimate_flooring_configs.c.threshold_profile_count,
                    estimate_flooring_configs.c.threshold_profile_price,
                    estimate_flooring_configs.c.global_items_json,
                    estimate_flooring_configs.c.created_at,
                    estimate_flooring_configs.c.updated_at,
                ).where(
                    self._required_owner_clause(estimate_flooring_configs),
                    estimate_flooring_configs.c.project_id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def ensure_estimate_flooring_config(self, project_id: int) -> dict[str, Any]:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return {"project_id": project_id}
                result = await session.execute(
                    select(estimate_flooring_configs.c.project_id).where(
                        self._required_owner_clause(estimate_flooring_configs),
                        estimate_flooring_configs.c.project_id == project_id,
                    )
                )
                if result.scalar_one_or_none() is None:
                    await session.execute(
                        insert(estimate_flooring_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                        )
                    )
        return await self.get_estimate_flooring_config(project_id) or {"project_id": project_id}

    async def update_estimate_flooring_config(
        self,
        project_id: int,
        *,
        include_underlay: bool,
        include_plinth: bool,
        include_demolition: bool,
        include_preparation: bool,
        default_preparation_id: int | None,
        demolition_price_per_m2: float,
        underlay_price_per_m2: float,
        plinth_material_price_per_m: float,
        plinth_install_price_per_m: float,
        threshold_profile_count: int,
        threshold_profile_price: float,
        global_items_json: str,
    ) -> None:
        owner_user_id = self._required_owner_user_id()
        values = {
            "include_underlay": _bool_int(include_underlay),
            "include_plinth": _bool_int(include_plinth),
            "include_demolition": _bool_int(include_demolition),
            "include_preparation": _bool_int(include_preparation),
            "default_preparation_id": default_preparation_id,
            "demolition_price_per_m2": demolition_price_per_m2,
            "underlay_price_per_m2": underlay_price_per_m2,
            "plinth_material_price_per_m": plinth_material_price_per_m,
            "plinth_install_price_per_m": plinth_install_price_per_m,
            "threshold_profile_count": threshold_profile_count,
            "threshold_profile_price": threshold_profile_price,
            "global_items_json": global_items_json,
            "updated_at": func.current_timestamp(),
        }
        async with self._session_factory() as session:
            async with session.begin():
                if await self._owned_estimate_project_id(session, project_id) is None:
                    return
                result = await session.execute(
                    update(estimate_flooring_configs)
                    .where(
                        self._required_owner_clause(estimate_flooring_configs),
                        estimate_flooring_configs.c.project_id == project_id,
                    )
                    .values(**values)
                )
                if not result.rowcount:
                    await session.execute(
                        insert(estimate_flooring_configs).values(
                            owner_user_id=owner_user_id,
                            project_id=project_id,
                            **values,
                        )
                    )
                await self._touch_estimate_project(session, project_id)

    async def list_estimate_flooring_rooms(self, project_id: int) -> list[dict[str, Any]]:
        return await self._list_project_rows(
            estimate_flooring_rooms,
            project_id,
            estimate_flooring_rooms.c.id,
            estimate_flooring_rooms.c.project_id,
            estimate_flooring_rooms.c.room_id,
            estimate_flooring_rooms.c.covering_id,
            estimate_flooring_rooms.c.preparation_id,
            estimate_flooring_rooms.c.layout_id,
            estimate_flooring_rooms.c.area_m2_override,
            estimate_flooring_rooms.c.perimeter_m_override,
            estimate_flooring_rooms.c.plinth_m_override,
            estimate_flooring_rooms.c.note,
            estimate_flooring_rooms.c.sort_order,
            estimate_flooring_rooms.c.created_at,
            estimate_flooring_rooms.c.updated_at,
        )

    async def list_estimate_flooring_room_zones(self, project_id: int) -> list[dict[str, Any]]:
        return await self._list_project_rows(
            estimate_flooring_room_zones,
            project_id,
            estimate_flooring_room_zones.c.id,
            estimate_flooring_room_zones.c.project_id,
            estimate_flooring_room_zones.c.room_id,
            estimate_flooring_room_zones.c.covering_id,
            estimate_flooring_room_zones.c.preparation_id,
            estimate_flooring_room_zones.c.layout_id,
            estimate_flooring_room_zones.c.area_m2,
            estimate_flooring_room_zones.c.note,
            estimate_flooring_room_zones.c.sort_order,
            estimate_flooring_room_zones.c.created_at,
            estimate_flooring_room_zones.c.updated_at,
        )

    async def replace_estimate_flooring_rooms(self, project_id: int, rooms: list[dict[str, Any]]) -> None:
        await self._replace_flooring_rows(project_id, rooms, estimate_flooring_rooms)

    async def replace_estimate_flooring_room_zones(self, project_id: int, zones: list[dict[str, Any]]) -> None:
        await self._replace_flooring_rows(project_id, zones, estimate_flooring_room_zones)

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
            raise ConflictError("Flooring catalog item with this title or code already exists") from exc

    async def _get_global_catalog_item(self, table, item_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(*(column for column in table.c if column.name != "owner_user_id")).where(
                    table.c.owner_user_id.is_(None),
                    table.c.is_active == 1,
                    table.c.id == item_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def _update_global_catalog_item(self, table, item_id: int, values: dict[str, Any]) -> bool:
        if self._owner_user_id is not None:
            return False
        if not values:
            return False
        try:
            async with self._session_factory() as session:
                async with session.begin():
                    result = await session.execute(
                        update(table)
                        .where(
                            table.c.owner_user_id.is_(None),
                            table.c.is_active == 1,
                            table.c.id == item_id,
                        )
                        .values(**values, updated_at=func.current_timestamp())
                    )
                    return bool(result.rowcount)
        except IntegrityError as exc:
            raise ConflictError("Flooring catalog item with this title or code already exists") from exc

    async def _delete_global_catalog_item(self, table, item_id: int) -> bool:
        if self._owner_user_id is not None:
            return False
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(table)
                    .where(
                        table.c.owner_user_id.is_(None),
                        table.c.is_active == 1,
                        table.c.id == item_id,
                    )
                    .values(is_active=0, updated_at=func.current_timestamp())
                )
                return bool(result.rowcount)

    async def _fetch_visible_catalog_assembly(
        self,
        session,
        target_kind: str,
        target_id: int,
    ) -> dict[str, Any] | None:
        result = await session.execute(
            select(
                *(
                    column
                    for column in estimate_flooring_catalog_assemblies.c
                    if column.name != "owner_user_id"
                )
            ).where(
                self._visible_catalog_clause(estimate_flooring_catalog_assemblies),
                estimate_flooring_catalog_assemblies.c.is_active == 1,
                estimate_flooring_catalog_assemblies.c.target_kind == target_kind,
                estimate_flooring_catalog_assemblies.c.target_id == target_id,
            )
        )
        return _row_to_dict(result.fetchone())

    async def _writable_catalog_assembly_id(
        self,
        session,
        target_kind: str,
        target_id: int,
    ) -> int | None:
        result = await session.execute(
            select(estimate_flooring_catalog_assemblies.c.id).where(
                self._owner_clause(estimate_flooring_catalog_assemblies),
                estimate_flooring_catalog_assemblies.c.is_active == 1,
                estimate_flooring_catalog_assemblies.c.target_kind == target_kind,
                estimate_flooring_catalog_assemblies.c.target_id == target_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _upsert_catalog_assembly(
        self,
        session,
        *,
        target_kind: str,
        target_id: int,
        title: str,
        version: str,
        owner_user_id: int | None,
    ) -> int:
        assembly_id = await self._writable_catalog_assembly_id(session, target_kind, target_id)
        if assembly_id is not None:
            await session.execute(
                update(estimate_flooring_catalog_assemblies)
                .where(estimate_flooring_catalog_assemblies.c.id == assembly_id)
                .values(title=title, version=version, updated_at=func.current_timestamp())
            )
            return assembly_id
        result = await session.execute(
            insert(estimate_flooring_catalog_assemblies).values(
                owner_user_id=owner_user_id,
                target_kind=target_kind,
                target_id=target_id,
                title=title,
                version=version,
            )
        )
        return int(result.inserted_primary_key[0])

    def _catalog_assembly_row_values(self, row: dict[str, Any], *, index: int) -> dict[str, Any]:
        assembly_item_id = row.get("assembly_item_id")
        return {
            "assembly_item_id": int(assembly_item_id) if assembly_item_id not in (None, "") else None,
            "section": str(row["section"]),
            "kind": str(row["kind"]),
            "formula": str(row["formula"]),
            "title": str(row["title"]),
            "unit": str(row.get("unit") or "pcs"),
            "price": float(row.get("price") or 0),
            "consumption_per_m2": float(row.get("consumption_per_m2") or 0),
            "package_size": _float_or_none(row.get("package_size")),
            "layer_mm": _float_or_none(row.get("layer_mm")),
            "sort_order": int(row.get("sort_order") or index * 10),
            "is_enabled": _bool_int(bool(row.get("is_enabled", True))),
            "public_category": str(row["public_category"]),
            "public_title": row.get("public_title"),
        }

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

    async def _replace_flooring_rows(self, project_id: int, rows: list[dict[str, Any]], table) -> None:
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
                        values["perimeter_m_override"] = _float_or_none(row.get("perimeter_m_override"))
                        values["plinth_m_override"] = _float_or_none(row.get("plinth_m_override"))
                    else:
                        values["area_m2"] = _float_or_none(row.get("area_m2"))
                    await session.execute(insert(table).values(**values))
                await self._touch_estimate_project(session, project_id)
