from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, func, insert, literal, select, update

from supply_bot.storage_projects.accounting_repository import SqlAlchemyProjectAccountingRepository
from supply_bot.storage_projects.contracts_repository import SqlAlchemyProjectContractsRepository
from supply_bot.storage_projects.documents_repository import SqlAlchemyProjectDocumentsRepository
from supply_bot.storage_projects.tables import (
    project_advances,
    project_contract_milestones,
    project_contracts,
    project_ledger_documents,
    project_ledger_entries,
    projects,
)
from supply_bot.storage_scope import RequiredOwnerScopedSqlAlchemyRepository

_PROJECT_SELECT_COLUMNS = (
    projects.c.id,
    projects.c.code,
    projects.c.name,
    projects.c.address,
    projects.c.entrance_section,
    projects.c.apartment,
    projects.c.floor,
    projects.c.room_count,
    projects.c.has_elevator,
    projects.c.site_access,
    projects.c.access_hours,
    projects.c.intercom_code,
    projects.c.responsible_person,
    projects.c.comment,
    projects.c.stage_label,
    projects.c.stage_tone,
    projects.c.estimate_project_id,
    literal(None).label("estimate_project_name"),
    projects.c.estimate_source,
    projects.c.area_m2,
    projects.c.ceiling_height_m,
    projects.c.received_total,
    projects.c.remaining_total,
    projects.c.deferred_total,
    projects.c.planned_total,
    projects.c.actual_total,
    projects.c.work_per_m2,
    projects.c.materials_per_m2,
    projects.c.planned_margin_percent,
    projects.c.tax_rate_percent,
    projects.c.tax_base_mode,
    projects.c.next_delivery_label,
    projects.c.created_at,
    projects.c.updated_at,
)


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
    if "amount" in name or "total" in name or "percent" in name or name.endswith(("_m2", "_m")):
        return 0.0
    if name in {"has_elevator", "is_paid", "is_required"}:
        return False
    if name in {"room_count", "position", "sort_order", "quantity"}:
        return 0
    return ""


def _insert_values(table: Any, data: dict[str, Any], fixed: dict[str, Any]) -> dict[str, Any]:
    values = dict(fixed)
    blocked = {"id", "created_at", "updated_at", "estimate_project_name"}
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
    blocked = {"id", "owner_user_id", "created_at", "updated_at", "estimate_project_name"}
    values = {key: value for key, value in data.items() if key in table.c and key not in blocked}
    if values and "updated_at" in table.c:
        values["updated_at"] = func.current_timestamp()
    return values


class SqlAlchemyProjectRepository(RequiredOwnerScopedSqlAlchemyRepository):
    async def list_projects(self, *, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(*_PROJECT_SELECT_COLUMNS)
                .where(self._required_owner_clause(projects))
                .order_by(projects.c.updated_at.desc(), projects.c.id.desc())
                .limit(limit)
                .offset(offset)
            )
            return [_row_to_dict(row) for row in result.fetchall()]

    async def count_projects(self) -> int:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(func.count()).select_from(projects).where(self._required_owner_clause(projects))
            )
            return int(result.scalar_one())

    async def create_project(self, **data: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        values = _insert_values(projects, data, {"owner_user_id": owner_user_id})
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(insert(projects).values(**values))
                return int(result.inserted_primary_key[0])

    async def get_project(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(*_PROJECT_SELECT_COLUMNS).where(
                    self._required_owner_clause(projects),
                    projects.c.id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def update_project(self, project_id: int, **updates: Any) -> bool:
        self._required_owner_user_id()
        values = _update_values(projects, updates)
        if not values:
            return False
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(projects)
                    .where(self._required_owner_clause(projects), projects.c.id == project_id)
                    .values(**values)
                )
                return bool(result.rowcount)

    async def delete_project(self, project_id: int) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                ledger_result = await session.execute(
                    select(project_ledger_entries.c.id).where(
                        self._required_owner_clause(project_ledger_entries),
                        project_ledger_entries.c.project_id == project_id,
                    )
                )
                ledger_ids = list(ledger_result.scalars().all())
                contract_result = await session.execute(
                    select(project_contracts.c.id).where(
                        self._required_owner_clause(project_contracts),
                        project_contracts.c.project_id == project_id,
                    )
                )
                contract_ids = list(contract_result.scalars().all())

                if ledger_ids:
                    await session.execute(
                        delete(project_ledger_documents).where(
                            self._required_owner_clause(project_ledger_documents),
                            project_ledger_documents.c.ledger_entry_id.in_(ledger_ids),
                        )
                    )
                if contract_ids:
                    await session.execute(
                        delete(project_contract_milestones).where(
                            self._required_owner_clause(project_contract_milestones),
                            project_contract_milestones.c.contract_id.in_(contract_ids),
                        )
                    )
                await session.execute(
                    delete(project_advances).where(
                        self._required_owner_clause(project_advances),
                        project_advances.c.project_id == project_id,
                    )
                )
                await session.execute(
                    delete(project_ledger_entries).where(
                        self._required_owner_clause(project_ledger_entries),
                        project_ledger_entries.c.project_id == project_id,
                    )
                )
                await session.execute(
                    delete(project_contracts).where(
                        self._required_owner_clause(project_contracts),
                        project_contracts.c.project_id == project_id,
                    )
                )
                result = await session.execute(
                    delete(projects).where(self._required_owner_clause(projects), projects.c.id == project_id)
                )
                return bool(result.rowcount)


class SqlAlchemyProjectWorkspaceRepository(
    SqlAlchemyProjectRepository,
    SqlAlchemyProjectAccountingRepository,
    SqlAlchemyProjectDocumentsRepository,
    SqlAlchemyProjectContractsRepository,
):
    pass
