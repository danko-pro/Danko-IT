from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping

TELEGRAM_NOTIFICATION_PENDING = "pending"
TELEGRAM_NOTIFICATION_SENT = "sent"

TELEGRAM_NOTIFICATION_STATUSES = {
    TELEGRAM_NOTIFICATION_PENDING,
    TELEGRAM_NOTIFICATION_SENT,
}


@dataclass(frozen=True, slots=True)
class TelegramNotification:
    id: int
    chat_id: int
    text: str
    status: str
    attempts: int
    last_error: str | None
    next_attempt_at: str
    sent_at: str | None
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: Mapping[str, Any]) -> TelegramNotification:
        return cls(
            id=int(row["id"]),
            chat_id=int(row["chat_id"]),
            text=str(row["text"]),
            status=str(row["status"]),
            attempts=int(row["attempts"] or 0),
            last_error=str(row["last_error"]) if row["last_error"] is not None else None,
            next_attempt_at=str(row["next_attempt_at"]),
            sent_at=str(row["sent_at"]) if row["sent_at"] is not None else None,
            created_at=str(row["created_at"]),
            updated_at=str(row["updated_at"]),
        )

    def to_api_dict(self) -> dict[str, Any]:
        return asdict(self)
