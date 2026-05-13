from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.storage_catalog.tables import material_families, material_skus, unknown_terms
from supply_bot.storage_projects.tables import (
    project_contracts,
    project_ledger_documents,
    project_ledger_entries,
    projects,
)
from supply_bot.storage_requests.tables import group_profiles, request_drafts
from supply_bot.storage_scope import OwnerScopedSqlAlchemyRepository

ACTIVE_DASHBOARD_DRAFT_STATUSES = ("collecting", "awaiting_confirmation")


def _as_int(value: Any) -> int:
    return int(value or 0)


def _as_float(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


class SqlAlchemyDashboardReadModel(OwnerScopedSqlAlchemyRepository):
    """Owner-scoped read-model для `/api/dashboard/summary` без legacy SQLite."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        owner_user_id: int | None = None,
        project_owner_user_id: int | None = None,
    ) -> None:
        super().__init__(session_factory, owner_user_id=owner_user_id)
        self._project_owner_user_id = project_owner_user_id

    def for_scope(
        self,
        *,
        owner_user_id: int | None,
        project_owner_user_id: int | None,
    ) -> SqlAlchemyDashboardReadModel:
        return SqlAlchemyDashboardReadModel(
            self._session_factory,
            owner_user_id=owner_user_id,
            project_owner_user_id=project_owner_user_id,
        )

    def _catalog_visible_clause(self, table: Any) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return or_(table.c.owner_user_id.is_(None), table.c.owner_user_id == self._owner_user_id)

    def _project_owner_clause(self, table: Any) -> Any:
        if self._project_owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return table.c.owner_user_id == self._project_owner_user_id

    async def get_summary(self) -> dict[str, int | float]:
        today = date.today().isoformat()
        async with self._session_factory() as session:
            project_totals = await self._project_totals(session)
            return {
                "families_count": await self._count(
                    session,
                    material_families,
                    self._catalog_visible_clause(material_families),
                    material_families.c.is_active.is_(True),
                ),
                "skus_count": await self._count(
                    session,
                    material_skus,
                    self._catalog_visible_clause(material_skus),
                    material_skus.c.is_active.is_(True),
                ),
                "groups_count": await self._count(session, group_profiles, self._owner_clause(group_profiles)),
                "active_drafts_count": await self._count(
                    session,
                    request_drafts,
                    self._owner_clause(request_drafts),
                    request_drafts.c.status.in_(ACTIVE_DASHBOARD_DRAFT_STATUSES),
                ),
                "confirmed_requests_count": await self._count(
                    session,
                    request_drafts,
                    self._owner_clause(request_drafts),
                    request_drafts.c.status == "confirmed",
                ),
                "confirmed_today_count": await self._count(
                    session,
                    request_drafts,
                    self._owner_clause(request_drafts),
                    request_drafts.c.status == "confirmed",
                    func.substr(request_drafts.c.updated_at, 1, 10) == today,
                ),
                "new_unknown_terms_count": await self._count(
                    session,
                    unknown_terms,
                    self._catalog_visible_clause(unknown_terms),
                    unknown_terms.c.status == "new",
                ),
                **project_totals,
                "project_ledger_entries_count": await self._count(
                    session,
                    project_ledger_entries,
                    self._project_owner_clause(project_ledger_entries),
                ),
                "project_ledger_documents_count": await self._count(
                    session,
                    project_ledger_documents,
                    self._project_owner_clause(project_ledger_documents),
                ),
                "project_contracts_count": await self._count(
                    session,
                    project_contracts,
                    self._project_owner_clause(project_contracts),
                ),
            }

    async def _project_totals(self, session: AsyncSession) -> dict[str, int | float]:
        result = await session.execute(
            select(
                func.count(projects.c.id).label("projects_count"),
                func.coalesce(func.sum(projects.c.received_total), 0).label("project_received_total"),
                func.coalesce(func.sum(projects.c.remaining_total), 0).label("project_remaining_total"),
                func.coalesce(func.sum(projects.c.deferred_total), 0).label("project_deferred_total"),
                func.coalesce(func.sum(projects.c.planned_total), 0).label("project_planned_total"),
                func.coalesce(func.sum(projects.c.actual_total), 0).label("project_actual_total"),
            ).where(self._project_owner_clause(projects))
        )
        row = result.mappings().one()
        return {
            "projects_count": _as_int(row["projects_count"]),
            "project_received_total": _as_float(row["project_received_total"]),
            "project_remaining_total": _as_float(row["project_remaining_total"]),
            "project_deferred_total": _as_float(row["project_deferred_total"]),
            "project_planned_total": _as_float(row["project_planned_total"]),
            "project_actual_total": _as_float(row["project_actual_total"]),
        }

    async def _count(self, session: AsyncSession, table: Any, *clauses: Any) -> int:
        result = await session.execute(select(func.count()).select_from(table).where(*clauses))
        return _as_int(result.scalar_one())
