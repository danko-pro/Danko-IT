from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_projects.tables import project_advances, project_ledger_entries, projects
from supply_bot.storage_scope import RequiredOwnerScopedSqlAlchemyRepository

_WORK_CATEGORIES = {"Работы", "work", "works", "Р Р°Р±РѕС‚С‹"}
_MATERIAL_CATEGORIES = {"Материалы", "material", "materials", "РњР°С‚РµСЂРёР°Р»С‹"}
_PAID_STATUSES = {"paid", "completed", "оплачен", "оплачено", "закрыт", "закрыто"}
_PLANNED_STATUSES = {"planned", "pending", "ожидает", "запланировано"}
_DEFERRED_STATUSES = {"waiting-payment", "waiting_payment", "deferred"}


def _as_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _as_date(value: Any) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    return value


def _row_to_dict(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    return {key: _serialize_value(value) for key, value in row._mapping.items()}


def _default_for_column(column: Any) -> Any:
    name = column.name
    if name.endswith("_at"):
        return datetime.utcnow()
    if "date" in name:
        return date.today()
    if "amount" in name or "total" in name or "percent" in name or name.endswith("_m2"):
        return 0.0
    if name in {"paid", "is_paid", "has_file", "is_required"}:
        return False
    if name in {"position", "sort_order", "quantity", "room_count"}:
        return 0
    return ""


def _insert_values(table: Any, data: dict[str, Any], fixed: dict[str, Any]) -> dict[str, Any]:
    values = dict(fixed)
    blocked = {"id", "created_at", "updated_at"}
    for column in table.c:
        name = column.name
        if name in values or name in blocked:
            continue
        if name in data:
            values[name] = data[name]
        elif not column.nullable and column.default is None and column.server_default is None:
            values[name] = _default_for_column(column)
    return values


def _update_values(table: Any, data: dict[str, Any]) -> dict[str, Any]:
    blocked = {"id", "owner_user_id", "project_id", "ledger_entry_id", "contract_id", "created_at", "updated_at"}
    values = {key: value for key, value in data.items() if key in table.c and key not in blocked}
    if values and "updated_at" in table.c:
        values["updated_at"] = func.current_timestamp()
    return values


def _advance_is_paid(data: dict[str, Any]) -> bool:
    if not any(key in data for key in ("status", "paid", "is_paid")):
        return True
    status = str(data.get("status", "")).lower()
    return bool(data.get("paid") or data.get("is_paid") or status in _PAID_STATUSES)


def _ledger_committed_amount(row: dict[str, Any]) -> float:
    plan_amount = _as_float(row.get("plan_amount"))
    actual_amount = _as_float(row.get("actual_amount"))
    if str(row.get("status", "")).lower() in _PLANNED_STATUSES:
        return plan_amount
    return actual_amount if actual_amount > 0 else plan_amount


def _ledger_paid_amount(row: dict[str, Any]) -> float:
    if str(row.get("status", "")).lower() not in _PAID_STATUSES:
        return 0.0
    plan_amount = _as_float(row.get("plan_amount"))
    actual_amount = _as_float(row.get("actual_amount"))
    return actual_amount if actual_amount > 0 else plan_amount


def _ledger_plan_balance_amount(row: dict[str, Any]) -> float:
    plan_amount = _as_float(row.get("plan_amount"))
    actual_amount = _as_float(row.get("actual_amount"))
    if plan_amount <= 0:
        return 0.0
    if str(row.get("status", "")).lower() in _PLANNED_STATUSES:
        return plan_amount
    if actual_amount > 0:
        return max(plan_amount - actual_amount, 0.0)
    return plan_amount


class SqlAlchemyProjectAccountingRepository(RequiredOwnerScopedSqlAlchemyRepository):
    async def list_project_advances(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_advances)
                .where(self._required_owner_clause(project_advances), project_advances.c.project_id == project_id)
                .order_by(project_advances.c.id.desc())
            )
            return [_row_to_dict(row) for row in result.fetchall()]

    async def get_project_advance(self, advance_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_advances).where(
                    self._required_owner_clause(project_advances),
                    project_advances.c.id == advance_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def create_project_advance(self, project_id: int, **data: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                await self._require_project(session, project_id)
                values = _insert_values(
                    project_advances,
                    data,
                    {"owner_user_id": owner_user_id, "project_id": project_id},
                )
                result = await session.execute(insert(project_advances).values(**values))
                advance_id = int(result.inserted_primary_key[0])
                if _advance_is_paid(values) or _advance_is_paid(data):
                    await self._apply_advance_delta(session, project_id, _as_float(values.get("amount")))
                return advance_id

    async def delete_project_advance(self, advance_id: int) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    select(project_advances).where(
                        self._required_owner_clause(project_advances),
                        project_advances.c.id == advance_id,
                    )
                )
                row = result.fetchone()
                if row is None:
                    return False
                data = dict(row._mapping)
                await session.execute(
                    delete(project_advances).where(
                        self._required_owner_clause(project_advances),
                        project_advances.c.id == advance_id,
                    )
                )
                if _advance_is_paid(data):
                    await self._apply_advance_delta(session, int(data["project_id"]), -_as_float(data.get("amount")))
                return True

    async def list_project_ledger_entries(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            order_column = (
                project_ledger_entries.c.sort_order
                if "sort_order" in project_ledger_entries.c
                else project_ledger_entries.c.id
            )
            result = await session.execute(
                select(project_ledger_entries)
                .where(
                    self._required_owner_clause(project_ledger_entries),
                    project_ledger_entries.c.project_id == project_id,
                )
                .order_by(order_column.asc(), project_ledger_entries.c.id.asc())
            )
            return [_row_to_dict(row) for row in result.fetchall()]

    async def list_project_ledger_entries_for_projects(
        self,
        project_ids: list[int],
    ) -> dict[int, list[dict[str, Any]]]:
        self._required_owner_user_id()
        if not project_ids:
            return {}

        entries_by_project: dict[int, list[dict[str, Any]]] = {project_id: [] for project_id in project_ids}
        async with self._session_factory() as session:
            order_column = (
                project_ledger_entries.c.sort_order
                if "sort_order" in project_ledger_entries.c
                else project_ledger_entries.c.id
            )
            result = await session.execute(
                select(project_ledger_entries)
                .where(
                    self._required_owner_clause(project_ledger_entries),
                    project_ledger_entries.c.project_id.in_(project_ids),
                )
                .order_by(
                    project_ledger_entries.c.project_id.asc(),
                    order_column.asc(),
                    project_ledger_entries.c.id.asc(),
                )
            )
            for row in result.fetchall():
                payload = _row_to_dict(row)
                if payload is not None:
                    entries_by_project.setdefault(int(payload["project_id"]), []).append(payload)
        return entries_by_project

    async def get_project_ledger_entry(self, ledger_entry_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_ledger_entries).where(
                    self._required_owner_clause(project_ledger_entries),
                    project_ledger_entries.c.id == ledger_entry_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def create_project_ledger_entry(self, project_id: int, **data: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                await self._require_project(session, project_id)
                prepared = dict(data)
                if "title" in prepared and "item" in project_ledger_entries.c:
                    prepared.setdefault("item", prepared["title"])
                if "due_date" in prepared and "control_date" in project_ledger_entries.c:
                    prepared.setdefault("control_date", prepared["due_date"])
                if "sort_order" in project_ledger_entries.c and "sort_order" not in prepared:
                    result = await session.execute(
                        select(func.max(project_ledger_entries.c.sort_order)).where(
                            self._required_owner_clause(project_ledger_entries),
                            project_ledger_entries.c.project_id == project_id,
                        )
                    )
                    prepared["sort_order"] = int(result.scalar() or 0) + 1
                values = _insert_values(
                    project_ledger_entries,
                    prepared,
                    {"owner_user_id": owner_user_id, "project_id": project_id},
                )
                result = await session.execute(insert(project_ledger_entries).values(**values))
                ledger_entry_id = int(result.inserted_primary_key[0])
                await self._sync_project_summary_from_ledger(session, project_id)
                return ledger_entry_id

    async def update_project_ledger_entry(self, ledger_entry_id: int, **updates: Any) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    select(project_ledger_entries.c.project_id).where(
                        self._required_owner_clause(project_ledger_entries),
                        project_ledger_entries.c.id == ledger_entry_id,
                    )
                )
                project_id = result.scalar_one_or_none()
                if project_id is None:
                    return False
                if "due_date" in updates and "control_date" in project_ledger_entries.c:
                    updates.setdefault("control_date", updates["due_date"])
                if "title" in updates and "item" in project_ledger_entries.c:
                    updates.setdefault("item", updates["title"])
                values = _update_values(project_ledger_entries, updates)
                if values:
                    await session.execute(
                        update(project_ledger_entries)
                        .where(
                            self._required_owner_clause(project_ledger_entries),
                            project_ledger_entries.c.id == ledger_entry_id,
                        )
                        .values(**values)
                    )
                await self._sync_project_summary_from_ledger(session, int(project_id))
                return True

    async def delete_project_ledger_entry(self, ledger_entry_id: int) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    select(project_ledger_entries.c.project_id).where(
                        self._required_owner_clause(project_ledger_entries),
                        project_ledger_entries.c.id == ledger_entry_id,
                    )
                )
                project_id = result.scalar_one_or_none()
                if project_id is None:
                    return False
                await session.execute(
                    delete(project_ledger_entries).where(
                        self._required_owner_clause(project_ledger_entries),
                        project_ledger_entries.c.id == ledger_entry_id,
                    )
                )
                await self._sync_project_summary_from_ledger(session, int(project_id))
                return True

    async def _require_project(self, session: Any, project_id: int) -> None:
        result = await session.execute(
            select(projects.c.id).where(self._required_owner_clause(projects), projects.c.id == project_id)
        )
        if result.scalar_one_or_none() is None:
            raise ValueError("Проект не найден для текущего владельца")

    async def _apply_advance_delta(self, session: Any, project_id: int, delta: float) -> None:
        await session.execute(
            update(projects)
            .where(self._required_owner_clause(projects), projects.c.id == project_id)
            .values(
                received_total=func.coalesce(projects.c.received_total, 0) + delta,
                remaining_total=func.coalesce(projects.c.remaining_total, 0) + delta,
                updated_at=func.current_timestamp(),
            )
        )

    async def _sync_project_summary_from_ledger(self, session: Any, project_id: int) -> None:
        result = await session.execute(
            select(project_ledger_entries).where(
                self._required_owner_clause(project_ledger_entries),
                project_ledger_entries.c.project_id == project_id,
            )
        )
        rows = [dict(row._mapping) for row in result.fetchall()]
        planned_total = sum(_ledger_plan_balance_amount(row) for row in rows)
        actual_total = sum(_ledger_paid_amount(row) for row in rows)
        deferred_total = sum(
            _ledger_committed_amount(row)
            for row in rows
            if str(row.get("status", "")).lower() in _DEFERRED_STATUSES
        )
        work_total = sum(_ledger_committed_amount(row) for row in rows if row.get("category") in _WORK_CATEGORIES)
        materials_total = sum(
            _ledger_committed_amount(row) for row in rows if row.get("category") in _MATERIAL_CATEGORIES
        )
        due_dates = sorted(
            due_date
            for row in rows
            for due_date in [_as_date(row.get("due_date") or row.get("control_date"))]
            if due_date is not None and _ledger_plan_balance_amount(row) > 0
        )

        project_result = await session.execute(
            select(projects.c.received_total, projects.c.area_m2).where(
                self._required_owner_clause(projects),
                projects.c.id == project_id,
            )
        )
        project_row = project_result.fetchone()
        received_total = _as_float(project_row.received_total if project_row is not None else 0)
        area_m2 = _as_float(project_row.area_m2 if project_row is not None else 0)
        work_per_m2 = work_total / area_m2 if area_m2 > 0 else 0.0
        materials_per_m2 = materials_total / area_m2 if area_m2 > 0 else 0.0

        await session.execute(
            update(projects)
            .where(self._required_owner_clause(projects), projects.c.id == project_id)
            .values(
                planned_total=planned_total,
                actual_total=actual_total,
                deferred_total=deferred_total,
                remaining_total=received_total - actual_total,
                work_per_m2=work_per_m2,
                materials_per_m2=materials_per_m2,
                next_delivery_label=due_dates[0].strftime("%d.%m") if due_dates else "",
                updated_at=func.current_timestamp(),
            )
        )
