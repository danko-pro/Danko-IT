from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import delete, func, insert, select, update

from supply_bot.storage_projects.tables import project_ledger_documents, project_ledger_entries, projects
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
    if "bytes" in name or "size" in name or name in {"position", "sort_order"}:
        return 0
    if name in {"has_file", "is_required"}:
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


def _update_values(table: Any, data: dict[str, Any]) -> dict[str, Any]:
    blocked = {"id", "owner_user_id", "project_id", "ledger_entry_id", "kind", "created_at", "updated_at"}
    values = {key: value for key, value in data.items() if key in table.c and key not in blocked}
    if values and "updated_at" in table.c:
        values["updated_at"] = func.current_timestamp()
    return values


class SqlAlchemyProjectDocumentsRepository(RequiredOwnerScopedSqlAlchemyRepository):
    async def list_project_ledger_documents(self, project_id: int) -> list[dict[str, Any]]:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_ledger_documents)
                .select_from(
                    project_ledger_documents.join(
                        project_ledger_entries,
                        project_ledger_documents.c.ledger_entry_id == project_ledger_entries.c.id,
                    )
                )
                .where(
                    self._required_owner_clause(project_ledger_documents),
                    self._required_owner_clause(project_ledger_entries),
                    project_ledger_entries.c.project_id == project_id,
                )
                .order_by(project_ledger_documents.c.id.asc())
            )
            return [_row_to_dict(row) for row in result.fetchall()]

    async def get_project_ledger_document(self, ledger_entry_id: int, kind: str) -> dict[str, Any] | None:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            result = await session.execute(
                select(project_ledger_documents).where(
                    self._required_owner_clause(project_ledger_documents),
                    project_ledger_documents.c.ledger_entry_id == ledger_entry_id,
                    project_ledger_documents.c.kind == kind,
                )
            )
            return _row_to_dict(result.fetchone())

    async def upsert_project_ledger_document(self, ledger_entry_id: int, kind: str, **data: Any) -> int:
        owner_user_id = self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                project_id = await self._require_ledger_entry(session, ledger_entry_id)
                result = await session.execute(
                    select(project_ledger_documents.c.id).where(
                        self._required_owner_clause(project_ledger_documents),
                        project_ledger_documents.c.ledger_entry_id == ledger_entry_id,
                        project_ledger_documents.c.kind == kind,
                    )
                )
                document_id = result.scalar_one_or_none()
                if document_id is not None:
                    values = _update_values(project_ledger_documents, data)
                    if values:
                        await session.execute(
                            update(project_ledger_documents)
                            .where(
                                self._required_owner_clause(project_ledger_documents),
                                project_ledger_documents.c.id == document_id,
                            )
                            .values(**values)
                        )
                    return int(document_id)

                fixed = {"owner_user_id": owner_user_id, "ledger_entry_id": ledger_entry_id, "kind": kind}
                if "project_id" in project_ledger_documents.c:
                    fixed["project_id"] = project_id
                values = _insert_values(project_ledger_documents, data, fixed)
                insert_result = await session.execute(insert(project_ledger_documents).values(**values))
                return int(insert_result.inserted_primary_key[0])

    async def update_project_ledger_document(
        self,
        document_id: int | None = None,
        *,
        ledger_entry_id: int | None = None,
        kind: str | None = None,
        **updates: Any,
    ) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                values = _update_values(project_ledger_documents, updates)
                if not values:
                    return False
                where_clauses = [self._required_owner_clause(project_ledger_documents)]
                if document_id is not None:
                    where_clauses.append(project_ledger_documents.c.id == document_id)
                else:
                    if ledger_entry_id is None or kind is None:
                        return False
                    where_clauses.append(project_ledger_documents.c.ledger_entry_id == ledger_entry_id)
                    where_clauses.append(project_ledger_documents.c.kind == kind)
                result = await session.execute(
                    update(project_ledger_documents)
                    .where(*where_clauses)
                    .values(**values)
                )
                return bool(result.rowcount)

    async def delete_project_ledger_document(
        self,
        document_id: int | None = None,
        *,
        ledger_entry_id: int | None = None,
        kind: str | None = None,
    ) -> bool:
        self._required_owner_user_id()
        async with self._session_factory() as session:
            async with session.begin():
                where_clauses = [self._required_owner_clause(project_ledger_documents)]
                if document_id is not None:
                    where_clauses.append(project_ledger_documents.c.id == document_id)
                else:
                    if ledger_entry_id is None or kind is None:
                        return False
                    where_clauses.append(project_ledger_documents.c.ledger_entry_id == ledger_entry_id)
                    where_clauses.append(project_ledger_documents.c.kind == kind)
                result = await session.execute(
                    delete(project_ledger_documents).where(*where_clauses)
                )
                return bool(result.rowcount)

    async def _require_ledger_entry(self, session: Any, ledger_entry_id: int) -> int:
        result = await session.execute(
            select(project_ledger_entries.c.project_id)
            .select_from(project_ledger_entries.join(projects, project_ledger_entries.c.project_id == projects.c.id))
            .where(
                self._required_owner_clause(project_ledger_entries),
                self._required_owner_clause(projects),
                project_ledger_entries.c.id == ledger_entry_id,
            )
        )
        project_id = result.scalar_one_or_none()
        if project_id is None:
            raise ValueError("Статья учета не найдена для текущего владельца")
        return int(project_id)
