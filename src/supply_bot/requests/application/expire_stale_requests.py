from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from supply_bot.application.errors import ValidationError


class StaleRequestsExpirationStorage(Protocol):
    async def expire_stale_active_drafts(self, *, max_age_hours: int) -> int: ...


@dataclass(frozen=True, slots=True)
class ExpireStaleRequestsCommand:
    max_age_hours: int | None
    default_max_age_hours: int


class ExpireStaleRequestsUseCase:
    def __init__(self, storage: StaleRequestsExpirationStorage) -> None:
        self.storage = storage

    async def execute(self, command: ExpireStaleRequestsCommand) -> dict[str, int]:
        resolved_max_age = (
            command.default_max_age_hours if command.max_age_hours is None else command.max_age_hours
        )
        if resolved_max_age < 0:
            raise ValidationError("max_age_hours must be non-negative")

        expired_count = await self.storage.expire_stale_active_drafts(max_age_hours=resolved_max_age)
        return {"expired_count": expired_count, "max_age_hours": resolved_max_age}
