from __future__ import annotations

import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from supply_bot.domain.request_lifecycle import (
    RequestLifecycleError,
    validate_request_status_transition,
)
from supply_bot.storage import BotStorage


def test_request_lifecycle_allows_normal_flow() -> None:
    status = validate_request_status_transition("collecting", "awaiting_confirmation")
    status = validate_request_status_transition(status, "confirmed")
    status = validate_request_status_transition(status, "in_progress")
    status = validate_request_status_transition(status, "done")

    assert status == "done"


def test_request_lifecycle_rejects_closed_request_to_done() -> None:
    with pytest.raises(RequestLifecycleError):
        validate_request_status_transition("cancelled", "done")


def test_storage_rejects_invalid_request_status_transition() -> None:
    with TemporaryDirectory() as tmp_dir:
        storage = BotStorage(Path(tmp_dir) / "test.sqlite3")
        asyncio.run(storage.initialize())
        draft_id = asyncio.run(
            storage.create_draft(
                chat_id=1001,
                master_id=2002,
                master_name="Lifecycle tester",
            )
        )

        asyncio.run(storage.set_draft_status(draft_id, status="cancelled"))

        with pytest.raises(RequestLifecycleError):
            asyncio.run(storage.set_draft_status(draft_id, status="done"))
