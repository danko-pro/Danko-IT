from __future__ import annotations

from typing import Any

from sqlalchemy import func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.domain.public_leads import (
    PUBLIC_LEAD_SOURCE_PUBLIC_LANDING,
    PUBLIC_LEAD_STATUS_NEW,
    PUBLIC_LEAD_TELEGRAM_DELIVERY_STATUSES,
    PUBLIC_LEAD_TELEGRAM_NOT_SENT,
    PublicLead,
)
from supply_bot.storage_public_leads.tables import public_leads


class SqlAlchemyPublicLeadRepository:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def create_public_lead(
        self,
        *,
        name: str,
        contact: str,
        contact_method: str = "",
        object_type: str = "",
        area: str = "",
        package_type: str = "",
        comment: str = "",
        source: str = PUBLIC_LEAD_SOURCE_PUBLIC_LANDING,
        status: str = PUBLIC_LEAD_STATUS_NEW,
        personal_data_consent: bool = True,
        telegram_delivery_status: str = PUBLIC_LEAD_TELEGRAM_NOT_SENT,
    ) -> int:
        values = {
            "name": name.strip(),
            "contact": contact.strip(),
            "contact_method": contact_method.strip(),
            "object_type": object_type.strip(),
            "area": area.strip(),
            "package_type": package_type.strip(),
            "comment": comment.strip(),
            "source": source,
            "status": status,
            "personal_data_consent": bool(personal_data_consent),
            "telegram_delivery_status": telegram_delivery_status,
        }
        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(insert(public_leads).values(**values))
                return int(result.inserted_primary_key[0])

    async def create_from_payload(self, payload: Any) -> int:
        return await self.create_public_lead(
            name=payload.name,
            contact=payload.phone,
            contact_method=payload.contactMethod,
            object_type=payload.objectType,
            area=payload.area,
            package_type=payload.packageType,
            comment=payload.comment,
            personal_data_consent=bool(payload.personalDataConsent),
        )

    async def mark_telegram_delivery(
        self,
        lead_id: int,
        *,
        status: str,
        telegram_message_id: int | None = None,
    ) -> bool:
        if status not in PUBLIC_LEAD_TELEGRAM_DELIVERY_STATUSES:
            raise ValueError(f"Unsupported public lead Telegram delivery status: {status}")

        values: dict[str, Any] = {
            "telegram_delivery_status": status,
            "updated_at": func.current_timestamp(),
        }
        if telegram_message_id is not None:
            values["telegram_message_id"] = telegram_message_id

        async with self._session_factory() as session:
            async with session.begin():
                result = await session.execute(
                    update(public_leads).where(public_leads.c.id == lead_id).values(**values)
                )
                return bool(result.rowcount)

    async def get_public_lead(self, lead_id: int) -> PublicLead | None:
        async with self._session_factory() as session:
            result = await session.execute(select(public_leads).where(public_leads.c.id == lead_id))
            row = result.fetchone()
            if row is None:
                return None
            return PublicLead.from_row(row._mapping)

    async def count_public_leads(self) -> int:
        async with self._session_factory() as session:
            result = await session.execute(select(func.count()).select_from(public_leads))
            return int(result.scalar_one())

    async def list_recent_public_leads(self, *, limit: int = 20) -> list[PublicLead]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(public_leads)
                .order_by(public_leads.c.created_at.desc(), public_leads.c.id.desc())
                .limit(max(1, min(limit, 100)))
            )
            return [PublicLead.from_row(row._mapping) for row in result.fetchall()]
