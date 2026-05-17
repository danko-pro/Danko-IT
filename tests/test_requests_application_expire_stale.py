from __future__ import annotations

import asyncio

import pytest

from supply_bot.application.errors import ValidationError
from supply_bot.requests.application.expire_stale_requests import (
    ExpireStaleRequestsCommand,
    ExpireStaleRequestsUseCase,
)


class FakeStaleRequestsStorage:
    def __init__(self, expired_count: int = 3) -> None:
        self.expired_count = expired_count
        self.max_age_hours: int | None = None

    async def expire_stale_active_drafts(self, *, max_age_hours: int) -> int:
        self.max_age_hours = max_age_hours
        return self.expired_count


def test_expire_stale_requests_uses_default_max_age_when_missing() -> None:
    storage = FakeStaleRequestsStorage(expired_count=2)
    command = ExpireStaleRequestsCommand(max_age_hours=None, default_max_age_hours=24)

    result = asyncio.run(ExpireStaleRequestsUseCase(storage).execute(command))

    assert storage.max_age_hours == 24
    assert result == {"expired_count": 2, "max_age_hours": 24}


def test_expire_stale_requests_uses_explicit_max_age() -> None:
    storage = FakeStaleRequestsStorage(expired_count=1)
    command = ExpireStaleRequestsCommand(max_age_hours=12, default_max_age_hours=24)

    result = asyncio.run(ExpireStaleRequestsUseCase(storage).execute(command))

    assert storage.max_age_hours == 12
    assert result == {"expired_count": 1, "max_age_hours": 12}


def test_expire_stale_requests_rejects_negative_max_age() -> None:
    storage = FakeStaleRequestsStorage()
    command = ExpireStaleRequestsCommand(max_age_hours=-1, default_max_age_hours=24)

    with pytest.raises(ValidationError, match="max_age_hours must be non-negative"):
        asyncio.run(ExpireStaleRequestsUseCase(storage).execute(command))

    assert storage.max_age_hours is None
