from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping


@dataclass(frozen=True, slots=True)
class RequestSummary:
    id: int
    chat_id: int
    master_id: int
    master_name: str
    status: str
    waiting_for: str | None
    updated_at: str
    confirmed_delivery_date: str | None
    confirmed_delivery_time: str | None
    requested_delivery_date: str | None
    requested_delivery_time: str | None
    object_name: str
    items_count: int

    @classmethod
    def from_row(cls, row: Mapping[str, Any]) -> RequestSummary:
        return cls(
            id=int(row["id"]),
            chat_id=int(row["chat_id"]),
            master_id=int(row["master_id"]),
            master_name=str(row["master_name"]),
            status=str(row["status"]),
            waiting_for=str(row["waiting_for"]) if row["waiting_for"] is not None else None,
            updated_at=str(row["updated_at"]),
            confirmed_delivery_date=str(row["confirmed_delivery_date"])
            if row["confirmed_delivery_date"] is not None
            else None,
            confirmed_delivery_time=str(row["confirmed_delivery_time"])
            if row["confirmed_delivery_time"] is not None
            else None,
            requested_delivery_date=str(row["requested_delivery_date"])
            if row["requested_delivery_date"] is not None
            else None,
            requested_delivery_time=str(row["requested_delivery_time"])
            if row["requested_delivery_time"] is not None
            else None,
            object_name=str(row["object_name"]),
            items_count=int(row["items_count"] or 0),
        )

    def to_api_dict(self) -> dict[str, Any]:
        return asdict(self)
