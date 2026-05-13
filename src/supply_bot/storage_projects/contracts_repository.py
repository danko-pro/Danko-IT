from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_projects.tables import project_contract_milestones, project_contracts, projects
from supply_bot.storage_scope import RequiredOwnerScopedSqlAlchemyRepository


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
    if "amount" in name or "total" in name or "percent" in name:
        return 0.0
    if name in {"position", "sort_order"}:
        return 0
    if name in {"is_paid", "is_required"}:
        return False
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


def _update_values(table: Any, data: dict[str, Any], *, keep_none: bool = False) -> dict[str, Any]:
    blocked = {"id", "owner_user_id", "project_id", "contract_id", "created_at", "updated_at"}
    values = {
        key: value
        for key, value in data.items()
        if key in table.c and key not in blocked and (keep_none or value is not None)
    }
    if values and "updated_at" in table.c:
        values["updated_at"] = func.current_timestamp()
    return values


class SqlAlchemyProjectContractsRepository(RequiredOwnerScopedSqlAlchemyRepository):
    async def get_project_contract(self, project_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_contracts).where(
                    self._required_owner_clause(project_contracts),
                    project_contracts.c.project_id == project_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def upsert_project_contract(self, project_id: int, **data: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                await self._require_project(session, project_id)
                result = await session.execute(
                    select(project_contracts.c.id).where(
                        self._required_owner_clause(project_contracts),
                        project_contracts.c.project_id == project_id,
                    )
                )
                contract_id = result.scalar_one_or_none()
                if contract_id is not None:
                    values = _update_values(project_contracts, data)
                    if values:
                        await session.execute(
                            update(project_contracts)
                            .where(
                                self._required_owner_clause(project_contracts),
                                project_contracts.c.id == contract_id,
                            )
                            .values(**values)
                        )
                    return int(contract_id)

                values = _insert_values(
                    project_contracts,
                    data,
                    {"owner_user_id": owner_user_id, "project_id": project_id},
                )
                insert_result = await session.execute(insert(project_contracts).values(**values))
                return int(insert_result.inserted_primary_key[0])

    async def delete_project_contract(self, project_id: int) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    select(project_contracts).where(
                        self._required_owner_clause(project_contracts),
                        project_contracts.c.project_id == project_id,
                    )
                )
                row = result.fetchone()
                if row is None:
                    return False
                contract = _row_to_dict(row)
                contract_id = int(contract["id"])
                await session.execute(
                    delete(project_contract_milestones).where(
                        self._required_owner_clause(project_contract_milestones),
                        project_contract_milestones.c.contract_id == contract_id,
                    )
                )
                await session.execute(
                    delete(project_contracts).where(
                        self._required_owner_clause(project_contracts),
                        project_contracts.c.id == contract_id,
                    )
                )
                return contract

    async def list_project_contract_milestones(self, contract_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            order_column = (
                project_contract_milestones.c.position
                if "position" in project_contract_milestones.c
                else project_contract_milestones.c.sort_order
                if "sort_order" in project_contract_milestones.c
                else project_contract_milestones.c.id
            )
            result = await session.execute(
                select(project_contract_milestones)
                .where(
                    self._required_owner_clause(project_contract_milestones),
                    project_contract_milestones.c.contract_id == contract_id,
                )
                .order_by(order_column.asc(), project_contract_milestones.c.id.asc())
            )
            return [_row_to_dict(row) for row in result.fetchall()]

    async def get_project_contract_milestone(self, milestone_id: int) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_contract_milestones).where(
                    self._required_owner_clause(project_contract_milestones),
                    project_contract_milestones.c.id == milestone_id,
                )
            )
            return _row_to_dict(result.fetchone())

    async def replace_project_contract_milestones(
        self,
        contract_id: int,
        milestones: list[dict[str, Any]],
    ) -> list[int]:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                await self._require_contract(session, contract_id)
                await session.execute(
                    delete(project_contract_milestones).where(
                        self._required_owner_clause(project_contract_milestones),
                        project_contract_milestones.c.contract_id == contract_id,
                    )
                )
                milestone_ids: list[int] = []
                for index, milestone in enumerate(milestones, start=1):
                    prepared = dict(milestone)
                    if "position" in project_contract_milestones.c and "position" not in prepared:
                        prepared["position"] = index
                    if "sort_order" in project_contract_milestones.c and "sort_order" not in prepared:
                        prepared["sort_order"] = index
                    values = _insert_values(
                        project_contract_milestones,
                        prepared,
                        {"owner_user_id": owner_user_id, "contract_id": contract_id},
                    )
                    result = await session.execute(insert(project_contract_milestones).values(**values))
                    milestone_ids.append(int(result.inserted_primary_key[0]))
                return milestone_ids

    async def update_project_contract_milestone(self, milestone_id: int, **updates: Any) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                values = _update_values(project_contract_milestones, updates, keep_none=True)
                if not values:
                    return False
                result = await session.execute(
                    update(project_contract_milestones)
                    .where(
                        self._required_owner_clause(project_contract_milestones),
                        project_contract_milestones.c.id == milestone_id,
                    )
                    .values(**values)
                )
                return bool(result.rowcount)

    async def _require_project(self, session: Any, project_id: int) -> None:
        result = await session.execute(
            select(projects.c.id).where(self._required_owner_clause(projects), projects.c.id == project_id)
        )
        if result.scalar_one_or_none() is None:
            raise ValueError("Проект не найден для текущего владельца")

    async def _require_contract(self, session: Any, contract_id: int) -> None:
        result = await session.execute(
            select(project_contracts.c.id).where(
                self._required_owner_clause(project_contracts),
                project_contracts.c.id == contract_id,
            )
        )
        if result.scalar_one_or_none() is None:
            raise ValueError("Договор не найден для текущего владельца")
