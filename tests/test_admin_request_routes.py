from __future__ import annotations

import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from supply_bot.admin_api.app import create_admin_app
from supply_bot.config import load_settings


def _create_settings_file(root: Path) -> Path:
    config_path = root / ".env.test"
    config_path.write_text(
        "\n".join(
            [
                "BOT_TOKEN=test-token",
                "DEBUG=1",
                "DATABASE_PATH=./test.sqlite3",
                "ADMIN_PASSWORD_HASH=your_admin_password_hash_here",
                "ADMIN_SESSION_SECRET=your_admin_session_secret_here",
                "PROJECT_DOCUMENTS_DIR=./project-documents",
            ]
        ),
        encoding="utf-8",
    )
    return config_path


def test_request_items_reject_negative_quantity_and_dimensions() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            draft_id = asyncio.run(
                client.app.state.storage.create_draft(
                    chat_id=1001,
                    master_id=2002,
                    master_name="Admin tester",
                )
            )

            quantity_response = client.post(
                f"/api/requests/{draft_id}/items",
                json={
                    "title": "Test material",
                    "quantity": -1,
                    "unit": "pcs",
                },
            )
            assert quantity_response.status_code == 400
            assert quantity_response.json()["detail"] == "Item quantity must be positive"

            create_response = client.post(
                f"/api/requests/{draft_id}/items",
                json={
                    "title": "Valid material",
                    "quantity": 1,
                    "unit": "pcs",
                },
            )
            assert create_response.status_code == 200
            item_id = int(create_response.json()["items"][0]["id"])

            dimensions_response = client.patch(
                f"/api/requests/items/{item_id}",
                json={
                    "title": "Valid material",
                    "quantity": 1,
                    "width_mm": -10,
                },
            )
            assert dimensions_response.status_code == 400
            assert dimensions_response.json()["detail"] == "Item dimensions must be positive"


def test_request_draft_participants_are_persisted() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            draft_id = asyncio.run(
                client.app.state.storage.create_draft(
                    chat_id=1001,
                    master_id=2002,
                    master_name="Admin tester",
                )
            )
            owner_is_participant = asyncio.run(
                client.app.state.storage.is_draft_participant(draft_id=draft_id, user_id=2002)
            )
            asyncio.run(
                client.app.state.storage.add_draft_participant(
                    draft_id=draft_id,
                    user_id=3003,
                    user_name="Helper tester",
                )
            )
            helper_is_participant = asyncio.run(
                client.app.state.storage.is_draft_participant(draft_id=draft_id, user_id=3003)
            )

            assert owner_is_participant
            assert helper_is_participant
