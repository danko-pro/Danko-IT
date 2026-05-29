from __future__ import annotations

import json
from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_estimates.repository import (
    SqlAlchemyEstimateRepository,
    _bool_int,
    _row_to_dict,
    _rows_to_dicts,
)
from supply_bot.storage_estimates.tables import (
    estimate_plumbing_catalog_audit,
    estimate_plumbing_catalog_items,
    estimate_plumbing_zone_items,
    estimate_plumbing_zone_package_items,
    estimate_plumbing_zone_packages,
    estimate_plumbing_zones,
)

_CATALOG_ITEM_BLOCKED = {"id", "owner_user_id", "created_at", "updated_at"}
_ZONE_BLOCKED = {"id", "owner_user_id", "created_at", "updated_at"}


class SqlAlchemyPlumbingRepository(SqlAlchemyEstimateRepository):
    # --- Атомарные позиции каталога (estimate_plumbing_catalog_items) ---

    async def list_plumbing_catalog_items(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            conditions = [self._visible_catalog_clause(estimate_plumbing_catalog_items)]
            if not include_inactive:
                conditions.append(estimate_plumbing_catalog_items.c.is_active == 1)
            result = await session.execute(
                select(*(column for column in estimate_plumbing_catalog_items.c if column.name != "owner_user_id"))
                .where(*conditions)
                .order_by(
                    estimate_plumbing_catalog_items.c.category,
                    estimate_plumbing_catalog_items.c.sort_order,
                    estimate_plumbing_catalog_items.c.source_code,
                    estimate_plumbing_catalog_items.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def get_plumbing_catalog_item(self, item_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    *(column for column in estimate_plumbing_catalog_items.c if column.name != "owner_user_id")
                ).where(
                    self._visible_catalog_clause(estimate_plumbing_catalog_items),
                    estimate_plumbing_catalog_items.c.id == item_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def create_plumbing_catalog_item(
        self,
        *,
        source_code: str,
        public_title: str,
        category: str,
        unit: str,
        technical_title: str | None = None,
        work_price: float = 0.0,
        material_price: float = 0.0,
        equipment_price: float = 0.0,
        consumables_price: float = 0.0,
        coefficient: float = 1.0,
        catalog_group: str | None = None,
        source: str | None = None,
        note: str | None = None,
        is_active: bool = True,
        sort_order: int = 100,
    ) -> int:
        payload = {
            "source_code": source_code,
            "public_title": public_title,
            "technical_title": technical_title,
            "category": category,
            "unit": unit,
            "work_price": work_price,
            "material_price": material_price,
            "equipment_price": equipment_price,
            "consumables_price": consumables_price,
            "coefficient": coefficient,
            "catalog_group": catalog_group,
            "source": source,
            "note": note,
            "is_active": _bool_int(is_active),
            "sort_order": sort_order,
        }
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_plumbing_catalog_items).values(
                        owner_user_id=self._catalog_write_owner_value(),
                        **payload,
                    )
                )
                item_id = int(result.inserted_primary_key[0])
                await self._record_audit(session, "item", item_id, "create", payload)
                return item_id

    async def update_plumbing_catalog_item(self, item_id: int, **updates: Any) -> bool:
        values = self._catalog_item_update_values(updates)
        if not values:
            return False
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_plumbing_catalog_items)
                    .where(
                        self._owner_clause(estimate_plumbing_catalog_items),
                        estimate_plumbing_catalog_items.c.id == item_id,
                    )
                    .values(**values, updated_at=func.current_timestamp())
                )
                if not result.rowcount:
                    return False
                await self._record_audit(session, "item", item_id, "update", values)
                return True

    async def delete_plumbing_catalog_item(self, item_id: int) -> bool:
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_plumbing_catalog_items)
                    .where(
                        self._owner_clause(estimate_plumbing_catalog_items),
                        estimate_plumbing_catalog_items.c.id == item_id,
                        estimate_plumbing_catalog_items.c.is_active == 1,
                    )
                    .values(is_active=0, updated_at=func.current_timestamp())
                )
                if not result.rowcount:
                    return False
                await self._record_audit(session, "item", item_id, "delete", {"is_active": 0})
                return True

    # --- Зоны (estimate_plumbing_zones) ---

    async def list_plumbing_zones(self, *, include_inactive: bool = False) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            conditions = [self._visible_catalog_clause(estimate_plumbing_zones)]
            if not include_inactive:
                conditions.append(estimate_plumbing_zones.c.is_active == 1)
            result = await session.execute(
                select(*(column for column in estimate_plumbing_zones.c if column.name != "owner_user_id"))
                .where(*conditions)
                .order_by(
                    estimate_plumbing_zones.c.sort_order,
                    estimate_plumbing_zones.c.subgroup,
                    estimate_plumbing_zones.c.zone_code,
                    estimate_plumbing_zones.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def get_plumbing_zone(self, zone_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(*(column for column in estimate_plumbing_zones.c if column.name != "owner_user_id")).where(
                    self._visible_catalog_clause(estimate_plumbing_zones),
                    estimate_plumbing_zones.c.id == zone_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def create_plumbing_zone(
        self,
        *,
        zone_code: str,
        subgroup: str,
        title: str,
        description: str | None = None,
        disclaimer: str | None = None,
        risk_percent: float = 6.4,
        active_package_code: str | None = None,
        is_active: bool = True,
        sort_order: int = 100,
    ) -> int:
        payload = {
            "zone_code": zone_code,
            "subgroup": subgroup,
            "title": title,
            "description": description,
            "disclaimer": disclaimer,
            "risk_percent": risk_percent,
            "active_package_code": active_package_code,
            "is_active": _bool_int(is_active),
            "sort_order": sort_order,
        }
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    insert(estimate_plumbing_zones).values(
                        owner_user_id=self._catalog_write_owner_value(),
                        **payload,
                    )
                )
                zone_id = int(result.inserted_primary_key[0])
                await self._record_audit(session, "zone", zone_id, "create", payload)
                return zone_id

    async def update_plumbing_zone(self, zone_id: int, **updates: Any) -> bool:
        values = self._zone_update_values(updates)
        if not values:
            return False
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_plumbing_zones)
                    .where(
                        self._owner_clause(estimate_plumbing_zones),
                        estimate_plumbing_zones.c.id == zone_id,
                    )
                    .values(**values, updated_at=func.current_timestamp())
                )
                if not result.rowcount:
                    return False
                await self._record_audit(session, "zone", zone_id, "update", values)
                return True

    async def delete_plumbing_zone(self, zone_id: int) -> bool:
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(estimate_plumbing_zones)
                    .where(
                        self._owner_clause(estimate_plumbing_zones),
                        estimate_plumbing_zones.c.id == zone_id,
                        estimate_plumbing_zones.c.is_active == 1,
                    )
                    .values(is_active=0, updated_at=func.current_timestamp())
                )
                if not result.rowcount:
                    return False
                await self._record_audit(session, "zone", zone_id, "delete", {"is_active": 0})
                return True

    # --- Состав зоны (база, estimate_plumbing_zone_items) ---

    async def list_plumbing_zone_items(self, zone_id: int) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            if await self._visible_zone_id(session, zone_id) is None:
                return []
            result = await session.execute(
                select(*(column for column in estimate_plumbing_zone_items.c if column.name != "owner_user_id"))
                .where(
                    self._visible_catalog_clause(estimate_plumbing_zone_items),
                    estimate_plumbing_zone_items.c.zone_id == zone_id,
                )
                .order_by(
                    estimate_plumbing_zone_items.c.sort_order,
                    estimate_plumbing_zone_items.c.id,
                )
            )
            return _rows_to_dicts(result.fetchall())

    async def replace_plumbing_zone_items(self, zone_id: int, items: list[dict[str, Any]]) -> bool:
        async with self._session_factory() as session:
            async with session.begin():
                if await self._writable_zone_id(session, zone_id) is None:
                    return False
                await session.execute(
                    delete(estimate_plumbing_zone_items).where(
                        self._owner_clause(estimate_plumbing_zone_items),
                        estimate_plumbing_zone_items.c.zone_id == zone_id,
                    )
                )
                inserted = await self._insert_composition_rows(
                    session,
                    estimate_plumbing_zone_items,
                    items,
                    extra_values={"zone_id": zone_id},
                )
                await self._record_audit(
                    session,
                    "zone_item",
                    zone_id,
                    "update",
                    {"items": inserted},
                )
                return True

    # --- Пакеты C/B/A зоны (estimate_plumbing_zone_packages + *_package_items) ---

    async def list_plumbing_zone_packages(self, zone_id: int) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            if await self._visible_zone_id(session, zone_id) is None:
                return []
            packages_result = await session.execute(
                select(*(column for column in estimate_plumbing_zone_packages.c if column.name != "owner_user_id"))
                .where(
                    self._visible_catalog_clause(estimate_plumbing_zone_packages),
                    estimate_plumbing_zone_packages.c.zone_id == zone_id,
                )
                .order_by(
                    estimate_plumbing_zone_packages.c.sort_order,
                    estimate_plumbing_zone_packages.c.package_code,
                    estimate_plumbing_zone_packages.c.id,
                )
            )
            packages = _rows_to_dicts(packages_result.fetchall())
            for package in packages:
                items_result = await session.execute(
                    select(
                        *(column for column in estimate_plumbing_zone_package_items.c if column.name != "owner_user_id")
                    )
                    .where(
                        self._visible_catalog_clause(estimate_plumbing_zone_package_items),
                        estimate_plumbing_zone_package_items.c.package_id == package["id"],
                    )
                    .order_by(
                        estimate_plumbing_zone_package_items.c.sort_order,
                        estimate_plumbing_zone_package_items.c.id,
                    )
                )
                package["items"] = _rows_to_dicts(items_result.fetchall())
            return packages

    async def replace_plumbing_zone_packages(self, zone_id: int, packages: list[dict[str, Any]]) -> bool:
        owner_value = self._catalog_write_owner_value()
        async with self._session_factory() as session:
            async with session.begin():
                if await self._writable_zone_id(session, zone_id) is None:
                    return False
                await session.execute(
                    delete(estimate_plumbing_zone_package_items).where(
                        self._owner_clause(estimate_plumbing_zone_package_items),
                        estimate_plumbing_zone_package_items.c.zone_id == zone_id,
                    )
                )
                await session.execute(
                    delete(estimate_plumbing_zone_packages).where(
                        self._owner_clause(estimate_plumbing_zone_packages),
                        estimate_plumbing_zone_packages.c.zone_id == zone_id,
                    )
                )
                audit_packages: list[dict[str, Any]] = []
                for package_index, package in enumerate(packages, start=1):
                    package_code = str(package["package_code"])
                    package_result = await session.execute(
                        insert(estimate_plumbing_zone_packages).values(
                            owner_user_id=owner_value,
                            zone_id=zone_id,
                            package_code=package_code,
                            label=package.get("label"),
                            sort_order=int(package.get("sort_order") or package_index * 10),
                        )
                    )
                    package_id = int(package_result.inserted_primary_key[0])
                    inserted = await self._insert_composition_rows(
                        session,
                        estimate_plumbing_zone_package_items,
                        package.get("items") or [],
                        extra_values={"zone_id": zone_id, "package_id": package_id},
                    )
                    audit_packages.append({"package_code": package_code, "items": inserted})
                await self._record_audit(
                    session,
                    "package",
                    zone_id,
                    "update",
                    {"packages": audit_packages},
                )
                return True

    # --- Внутренние помощники ---

    def _catalog_item_update_values(self, updates: dict[str, Any]) -> dict[str, Any]:
        values = {
            key: value
            for key, value in updates.items()
            if key in estimate_plumbing_catalog_items.c and key not in _CATALOG_ITEM_BLOCKED
        }
        if "is_active" in values:
            values["is_active"] = _bool_int(bool(values["is_active"]))
        return values

    def _zone_update_values(self, updates: dict[str, Any]) -> dict[str, Any]:
        values = {
            key: value
            for key, value in updates.items()
            if key in estimate_plumbing_zones.c and key not in _ZONE_BLOCKED
        }
        if "is_active" in values:
            values["is_active"] = _bool_int(bool(values["is_active"]))
        return values

    async def _visible_zone_id(self, session, zone_id: int) -> int | None:
        result = await session.execute(
            select(estimate_plumbing_zones.c.id).where(
                self._visible_catalog_clause(estimate_plumbing_zones),
                estimate_plumbing_zones.c.id == zone_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _writable_zone_id(self, session, zone_id: int) -> int | None:
        result = await session.execute(
            select(estimate_plumbing_zones.c.id).where(
                self._owner_clause(estimate_plumbing_zones),
                estimate_plumbing_zones.c.id == zone_id,
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _visible_catalog_item_id(self, session, item_id: Any) -> int | None:
        if item_id in (None, ""):
            return None
        result = await session.execute(
            select(estimate_plumbing_catalog_items.c.id).where(
                self._visible_catalog_clause(estimate_plumbing_catalog_items),
                estimate_plumbing_catalog_items.c.id == int(item_id),
            )
        )
        value = result.scalar_one_or_none()
        return int(value) if value is not None else None

    async def _insert_composition_rows(
        self,
        session,
        table,
        rows: list[dict[str, Any]],
        *,
        extra_values: dict[str, Any],
    ) -> list[dict[str, Any]]:
        owner_value = self._catalog_write_owner_value()
        inserted: list[dict[str, Any]] = []
        for index, row in enumerate(rows, start=1):
            values = {
                "atomic_item_id": await self._visible_catalog_item_id(session, row.get("atomic_item_id")),
                "atomic_source_code": str(row["atomic_source_code"]),
                "quantity": float(row.get("quantity") or 0),
                "coefficient": float(row.get("coefficient") or 1),
                "sort_order": int(row.get("sort_order") or index * 10),
            }
            await session.execute(insert(table).values(owner_user_id=owner_value, **values, **extra_values))
            inserted.append(values)
        return inserted

    # --- Аудит изменений (estimate_plumbing_catalog_audit) ---

    async def _record_audit(
        self,
        session,
        entity_type: str,
        entity_id: int | None,
        action: str,
        diff: dict[str, Any],
    ) -> None:
        await session.execute(
            insert(estimate_plumbing_catalog_audit).values(
                owner_user_id=self._owner_user_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                changed_by_user_id=self._owner_user_id,
                diff_json=json.dumps(diff, ensure_ascii=False, sort_keys=True),
            )
        )

    async def list_plumbing_catalog_audit(
        self,
        *,
        entity_type: str | None = None,
        entity_id: int | None = None,
    ) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            conditions = [self._owner_clause(estimate_plumbing_catalog_audit)]
            if entity_type is not None:
                conditions.append(estimate_plumbing_catalog_audit.c.entity_type == entity_type)
            if entity_id is not None:
                conditions.append(estimate_plumbing_catalog_audit.c.entity_id == entity_id)
            result = await session.execute(
                select(*(column for column in estimate_plumbing_catalog_audit.c if column.name != "owner_user_id"))
                .where(*conditions)
                .order_by(
                    estimate_plumbing_catalog_audit.c.id,
                )
            )
            rows = _rows_to_dicts(result.fetchall())
        for row in rows:
            row["diff"] = json.loads(row["diff_json"]) if row.get("diff_json") else None
        return rows
