from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, delete, func, insert, select, update

from supply_bot.domain.request_lifecycle import ACTIVE_REQUEST_STATUSES, validate_request_status_transition
from supply_bot.domain.requests import RequestSummary
from supply_bot.storage_catalog.tables import material_families, material_skus, material_variants
from supply_bot.storage_requests.tables import group_profiles, request_draft_participants, request_drafts, request_items
from supply_bot.storage_scope import OwnerScopedSqlAlchemyRepository


class SqlAlchemyRequestRepository(OwnerScopedSqlAlchemyRepository):
    def _now_text(self) -> str:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    async def _normalize_status_transition(self, draft_id: int, target_status: str) -> str:
        draft = await self.get_draft(draft_id)
        current_status = str(draft["status"]) if draft and draft.get("status") else None
        return validate_request_status_transition(current_status, target_status)

    async def get_active_draft(self, *, chat_id: int, master_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    self._draft_select()
                    .where(
                        self._owner_clause(request_drafts),
                        request_drafts.c.chat_id == chat_id,
                        request_drafts.c.master_id == master_id,
                        request_drafts.c.status.in_(ACTIVE_REQUEST_STATUSES),
                    )
                    .order_by(request_drafts.c.created_at.desc())
                    .limit(1)
                )
            ).mappings().first()
        return dict(row) if row else None

    async def get_active_draft_for_chat(self, *, chat_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    self._draft_select()
                    .where(
                        self._owner_clause(request_drafts),
                        request_drafts.c.chat_id == chat_id,
                        request_drafts.c.status.in_(ACTIVE_REQUEST_STATUSES),
                    )
                    .order_by(request_drafts.c.created_at.desc())
                    .limit(1)
                )
            ).mappings().first()
        return dict(row) if row else None

    async def expire_stale_active_drafts(self, *, max_age_hours: int, chat_id: int | None = None) -> int:
        if max_age_hours <= 0:
            return 0
        cutoff = (datetime.utcnow() - timedelta(hours=max_age_hours)).strftime("%Y-%m-%d %H:%M:%S")
        clauses = [
            self._owner_clause(request_drafts),
            request_drafts.c.status.in_(ACTIVE_REQUEST_STATUSES),
            request_drafts.c.updated_at < cutoff,
        ]
        if chat_id is not None:
            clauses.append(request_drafts.c.chat_id == chat_id)
        async with self._session_factory() as session:
            result = await session.execute(
                update(request_drafts)
                .where(and_(*clauses))
                .values(
                    status="cancelled",
                    waiting_for=None,
                    waiting_item_id=None,
                    updated_at=func.current_timestamp(),
                )
            )
            await session.commit()
        return int(result.rowcount or 0)

    async def create_draft(self, *, chat_id: int, master_id: int, master_name: str) -> int:
        async with self._session_factory() as session:
            result = await session.execute(
                insert(request_drafts).values(
                    owner_user_id=self._owner_user_id,
                    chat_id=chat_id,
                    master_id=master_id,
                    master_name=master_name,
                )
            )
            draft_id = int(result.inserted_primary_key[0])
            await session.execute(
                insert(request_draft_participants).values(
                    owner_user_id=self._owner_user_id,
                    draft_id=draft_id,
                    user_id=master_id,
                    user_name=master_name,
                    role="owner",
                )
            )
            await session.commit()
        return draft_id

    async def get_draft(self, draft_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    self._draft_select()
                    .where(self._owner_clause(request_drafts), request_drafts.c.id == draft_id)
                    .limit(1)
                )
            ).mappings().first()
        return dict(row) if row else None

    async def list_recent_request_summaries(self, *, limit: int = 20) -> list[RequestSummary]:
        safe_limit = max(1, min(limit, 100))
        object_name = func.coalesce(group_profiles.c.object_name, group_profiles.c.title, "Без объекта").label(
            "object_name"
        )
        profile_join = and_(
            group_profiles.c.chat_id == request_drafts.c.chat_id,
            self._owner_clause(group_profiles),
        )
        item_join = and_(request_items.c.draft_id == request_drafts.c.id, self._owner_clause(request_items))
        stmt = (
            select(
                request_drafts.c.id,
                request_drafts.c.chat_id,
                request_drafts.c.master_id,
                request_drafts.c.master_name,
                request_drafts.c.status,
                request_drafts.c.waiting_for,
                request_drafts.c.updated_at,
                request_drafts.c.confirmed_delivery_date,
                request_drafts.c.confirmed_delivery_time,
                request_drafts.c.requested_delivery_date,
                request_drafts.c.requested_delivery_time,
                object_name,
                func.count(request_items.c.id).label("items_count"),
            )
            .select_from(request_drafts.outerjoin(group_profiles, profile_join).outerjoin(request_items, item_join))
            .where(self._owner_clause(request_drafts))
            .group_by(
                request_drafts.c.id,
                request_drafts.c.chat_id,
                request_drafts.c.master_id,
                request_drafts.c.master_name,
                request_drafts.c.status,
                request_drafts.c.waiting_for,
                request_drafts.c.updated_at,
                request_drafts.c.confirmed_delivery_date,
                request_drafts.c.confirmed_delivery_time,
                request_drafts.c.requested_delivery_date,
                request_drafts.c.requested_delivery_time,
                group_profiles.c.object_name,
                group_profiles.c.title,
            )
            .order_by(request_drafts.c.updated_at.desc())
            .limit(safe_limit)
        )
        async with self._session_factory() as session:
            rows = (await session.execute(stmt)).mappings().all()
        return [RequestSummary.from_row(row) for row in rows]

    async def get_or_create_active_draft(self, *, chat_id: int, master_id: int, master_name: str) -> dict[str, Any]:
        draft = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if draft:
            await self.add_draft_participant(
                draft_id=draft["id"],
                user_id=master_id,
                user_name=master_name,
                role="owner",
            )
            return draft
        await self.create_draft(chat_id=chat_id, master_id=master_id, master_name=master_name)
        fresh = await self.get_active_draft(chat_id=chat_id, master_id=master_id)
        if fresh:
            return fresh
        raise RuntimeError("Не удалось создать черновик заявки.")

    async def add_draft_participant(
        self,
        *,
        draft_id: int,
        user_id: int,
        user_name: str | None,
        role: str = "participant",
    ) -> None:
        async with self._session_factory() as session:
            existing = (
                await session.execute(
                    select(request_draft_participants.c.draft_id)
                    .where(
                        self._owner_clause(request_draft_participants),
                        request_draft_participants.c.draft_id == draft_id,
                        request_draft_participants.c.user_id == user_id,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
            if existing is None:
                await session.execute(
                    insert(request_draft_participants).values(
                        owner_user_id=self._owner_user_id,
                        draft_id=draft_id,
                        user_id=user_id,
                        user_name=user_name,
                        role=role,
                    )
                )
            else:
                values = {
                    "user_name": user_name,
                    "updated_at": func.current_timestamp(),
                }
                if role == "owner":
                    values["role"] = "owner"
                await session.execute(
                    update(request_draft_participants)
                    .where(
                        self._owner_clause(request_draft_participants),
                        request_draft_participants.c.draft_id == draft_id,
                        request_draft_participants.c.user_id == user_id,
                    )
                    .values(**values)
                )
            await session.commit()

    async def is_draft_participant(self, *, draft_id: int, user_id: int) -> bool:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    select(request_draft_participants.c.draft_id)
                    .where(
                        self._owner_clause(request_draft_participants),
                        request_draft_participants.c.draft_id == draft_id,
                        request_draft_participants.c.user_id == user_id,
                    )
                    .limit(1)
                )
            ).scalar_one_or_none()
        return row is not None

    async def update_draft_waiting(
        self,
        draft_id: int,
        *,
        waiting_for: str | None,
        waiting_item_id: int | None = None,
        proposed_delivery_date: str | None = None,
        proposed_delivery_time: str | None = None,
        status: str | None = None,
    ) -> None:
        target_status = await self._normalize_status_transition(draft_id, status) if status is not None else None
        values: dict[str, Any] = {
            "waiting_for": waiting_for,
            "waiting_item_id": waiting_item_id,
            "proposed_delivery_date": proposed_delivery_date,
            "proposed_delivery_time": proposed_delivery_time,
        }
        if target_status is not None:
            values["status"] = target_status
        await self._update_draft(draft_id, **values)

    async def update_draft_delivery(
        self,
        draft_id: int,
        *,
        requested_date: str | None = None,
        requested_time: str | None = None,
        confirmed_date: str | None = None,
        confirmed_time: str | None = None,
        status: str | None = None,
    ) -> None:
        draft = await self.get_draft(draft_id)
        target_status = await self._normalize_status_transition(draft_id, status) if status is not None else None
        requested_delivery_date = requested_date
        requested_delivery_time = requested_time
        confirmed_delivery_date = confirmed_date
        confirmed_delivery_time = confirmed_time
        if draft:
            requested_delivery_date = requested_date or draft.get("requested_delivery_date")
            requested_delivery_time = requested_time or draft.get("requested_delivery_time")
            confirmed_delivery_date = confirmed_date or draft.get("confirmed_delivery_date")
            confirmed_delivery_time = confirmed_time or draft.get("confirmed_delivery_time")
        values = {
            "requested_delivery_date": requested_delivery_date,
            "requested_delivery_time": requested_delivery_time,
            "confirmed_delivery_date": confirmed_delivery_date,
            "confirmed_delivery_time": confirmed_delivery_time,
        }
        if target_status is not None:
            values["status"] = target_status
        await self._update_draft(draft_id, **values)

    async def set_draft_status(self, draft_id: int, *, status: str) -> None:
        target_status = await self._normalize_status_transition(draft_id, status)
        await self._update_draft(draft_id, status=target_status)

    async def update_draft_admin_fields(
        self,
        draft_id: int,
        *,
        status: str,
        waiting_for: str | None = None,
    ) -> None:
        target_status = await self._normalize_status_transition(draft_id, status)
        await self._update_draft(draft_id, status=target_status, waiting_for=waiting_for)

    async def touch_draft(self, draft_id: int) -> None:
        await self._update_draft(draft_id)

    async def delete_draft(self, draft_id: int) -> None:
        async with self._session_factory() as session:
            await session.execute(
                delete(request_drafts).where(self._owner_clause(request_drafts), request_drafts.c.id == draft_id)
            )
            await session.commit()

    async def replace_draft_delivery(
        self,
        draft_id: int,
        *,
        requested_date: str | None = None,
        requested_time: str | None = None,
        confirmed_date: str | None = None,
        confirmed_time: str | None = None,
        proposed_date: str | None = None,
        proposed_time: str | None = None,
        waiting_for: str | None = None,
        status: str | None = None,
    ) -> None:
        target_status = await self._normalize_status_transition(draft_id, status) if status is not None else None
        values = {
            "requested_delivery_date": requested_date,
            "requested_delivery_time": requested_time,
            "confirmed_delivery_date": confirmed_date,
            "confirmed_delivery_time": confirmed_time,
            "proposed_delivery_date": proposed_date,
            "proposed_delivery_time": proposed_time,
            "waiting_for": waiting_for,
        }
        if target_status is not None:
            values["status"] = target_status
        await self._update_draft(draft_id, **values)

    async def create_request_item(
        self,
        *,
        draft_id: int,
        family_id: int | None,
        variant_id: int | None,
        sku_id: int | None,
        raw_name: str,
        normalized_name: str | None,
        quantity: float | None = None,
        unit: str | None = None,
        thickness_mm: float | None = None,
        length_mm: float | None = None,
        width_mm: float | None = None,
        note: str | None = None,
    ) -> int:
        async with self._session_factory() as session:
            result = await session.execute(
                insert(request_items).values(
                    owner_user_id=self._owner_user_id,
                    draft_id=draft_id,
                    family_id=family_id,
                    variant_id=variant_id,
                    sku_id=sku_id,
                    raw_name=raw_name,
                    normalized_name=normalized_name,
                    material_name_snapshot=raw_name,
                    unit_snapshot=unit,
                    quantity=quantity,
                    unit=unit,
                    thickness_mm=thickness_mm,
                    length_mm=length_mm,
                    width_mm=width_mm,
                    note=note,
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def get_request_item(self, item_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            row = (
                await session.execute(
                    self._request_item_select()
                    .where(self._owner_clause(request_items), request_items.c.id == item_id)
                    .limit(1)
                )
            ).mappings().first()
        return dict(row) if row else None

    async def list_request_items(self, draft_id: int) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            rows = (
                await session.execute(
                    self._request_item_select()
                    .where(self._owner_clause(request_items), request_items.c.draft_id == draft_id)
                    .order_by(request_items.c.id)
                )
            ).mappings().all()
        return [dict(row) for row in rows]

    async def update_request_item(self, item_id: int, **fields: Any) -> None:
        if not fields:
            return
        allowed_fields = {
            "family_id",
            "variant_id",
            "sku_id",
            "raw_name",
            "normalized_name",
            "material_name_snapshot",
            "unit_snapshot",
            "quantity",
            "unit",
            "thickness_mm",
            "length_mm",
            "width_mm",
            "note",
            "status",
        }
        values = {key: value for key, value in fields.items() if key in allowed_fields}
        if "raw_name" in values and "material_name_snapshot" not in values:
            values["material_name_snapshot"] = values["raw_name"]
        if "unit" in values and "unit_snapshot" not in values:
            values["unit_snapshot"] = values["unit"]
        values["updated_at"] = self._now_text()
        async with self._session_factory() as session:
            await session.execute(
                update(request_items)
                .where(self._owner_clause(request_items), request_items.c.id == item_id)
                .values(**values)
            )
            await session.commit()

    async def delete_request_item(self, item_id: int) -> None:
        async with self._session_factory() as session:
            await session.execute(
                delete(request_items).where(self._owner_clause(request_items), request_items.c.id == item_id)
            )
            await session.commit()

    async def clear_request_items(self, draft_id: int) -> None:
        async with self._session_factory() as session:
            await session.execute(
                delete(request_items).where(self._owner_clause(request_items), request_items.c.draft_id == draft_id)
            )
            await session.commit()

    def _draft_select(self):
        return select(
            request_drafts.c.id,
            request_drafts.c.chat_id,
            request_drafts.c.master_id,
            request_drafts.c.master_name,
            request_drafts.c.status,
            request_drafts.c.waiting_for,
            request_drafts.c.waiting_item_id,
            request_drafts.c.requested_delivery_date,
            request_drafts.c.requested_delivery_time,
            request_drafts.c.confirmed_delivery_date,
            request_drafts.c.confirmed_delivery_time,
            request_drafts.c.proposed_delivery_date,
            request_drafts.c.proposed_delivery_time,
            request_drafts.c.created_at,
            request_drafts.c.updated_at,
            request_drafts.c.owner_user_id,
        )

    def _request_item_select(self):
        return select(
            request_items.c.id,
            request_items.c.draft_id,
            request_items.c.family_id,
            request_items.c.variant_id,
            request_items.c.sku_id,
            request_items.c.raw_name,
            request_items.c.normalized_name,
            request_items.c.material_name_snapshot,
            request_items.c.unit_snapshot,
            request_items.c.quantity,
            request_items.c.unit,
            request_items.c.thickness_mm,
            request_items.c.length_mm,
            request_items.c.width_mm,
            request_items.c.note,
            request_items.c.status,
            material_families.c.canonical_name.label("family_name"),
            material_variants.c.display_name.label("variant_name"),
            material_skus.c.title.label("sku_title"),
        ).select_from(
            request_items.outerjoin(material_families, material_families.c.id == request_items.c.family_id)
            .outerjoin(material_variants, material_variants.c.id == request_items.c.variant_id)
            .outerjoin(material_skus, material_skus.c.id == request_items.c.sku_id)
        )

    async def _update_draft(self, draft_id: int, **values: Any) -> None:
        values["updated_at"] = func.current_timestamp()
        async with self._session_factory() as session:
            await session.execute(
                update(request_drafts)
                .where(self._owner_clause(request_drafts), request_drafts.c.id == draft_id)
                .values(**values)
            )
            await session.commit()
