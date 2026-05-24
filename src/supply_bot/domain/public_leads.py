from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping

PUBLIC_LEAD_STATUS_NEW = "new"
PUBLIC_LEAD_STATUS_IN_PROGRESS = "in_progress"
PUBLIC_LEAD_STATUS_ACCEPTED = "accepted"
PUBLIC_LEAD_STATUS_POSTPONED = "postponed"
PUBLIC_LEAD_STATUS_REJECTED = "rejected"

PUBLIC_LEAD_STATUSES = {
    PUBLIC_LEAD_STATUS_NEW,
    PUBLIC_LEAD_STATUS_IN_PROGRESS,
    PUBLIC_LEAD_STATUS_ACCEPTED,
    PUBLIC_LEAD_STATUS_POSTPONED,
    PUBLIC_LEAD_STATUS_REJECTED,
}

PUBLIC_LEAD_SOURCE_PUBLIC_LANDING = "public_landing"

PUBLIC_LEAD_TELEGRAM_NOT_SENT = "not_sent"
PUBLIC_LEAD_TELEGRAM_SENT = "sent"
PUBLIC_LEAD_TELEGRAM_SKIPPED = "skipped"
PUBLIC_LEAD_TELEGRAM_FAILED = "failed"

PUBLIC_LEAD_TELEGRAM_DELIVERY_STATUSES = {
    PUBLIC_LEAD_TELEGRAM_NOT_SENT,
    PUBLIC_LEAD_TELEGRAM_SENT,
    PUBLIC_LEAD_TELEGRAM_SKIPPED,
    PUBLIC_LEAD_TELEGRAM_FAILED,
}


@dataclass(frozen=True, slots=True)
class PublicLead:
    id: int
    name: str
    contact: str
    contact_method: str
    object_type: str
    area: str
    package_type: str
    comment: str
    source: str
    status: str
    personal_data_consent: bool
    telegram_delivery_status: str
    telegram_message_id: int | None
    created_at: str
    updated_at: str
    reviewed_by: int | None
    reviewed_at: str | None

    @classmethod
    def from_row(cls, row: Mapping[str, Any]) -> PublicLead:
        return cls(
            id=int(row["id"]),
            name=str(row["name"]),
            contact=str(row["contact"]),
            contact_method=str(row["contact_method"]),
            object_type=str(row["object_type"]),
            area=str(row["area"]),
            package_type=str(row["package_type"]),
            comment=str(row["comment"]),
            source=str(row["source"]),
            status=str(row["status"]),
            personal_data_consent=bool(row["personal_data_consent"]),
            telegram_delivery_status=str(row["telegram_delivery_status"]),
            telegram_message_id=int(row["telegram_message_id"]) if row["telegram_message_id"] is not None else None,
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
            reviewed_by=int(row["reviewed_by"]) if row["reviewed_by"] is not None else None,
            reviewed_at=str(row["reviewed_at"]) if row["reviewed_at"] is not None else None,
        )

    def to_api_dict(self) -> dict[str, Any]:
        return asdict(self)
