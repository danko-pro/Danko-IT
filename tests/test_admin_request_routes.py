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


async def _make_draft_old(storage, draft_id: int) -> None:
    async with storage.connection() as db:
        await db.execute(
            """
            UPDATE request_drafts
            SET updated_at = datetime('now', '-48 hours')
            WHERE id = ?
            """,
            (draft_id,),
        )
        await db.commit()


def test_stale_active_request_drafts_are_cancelled() -> None:
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
            asyncio.run(_make_draft_old(client.app.state.storage, draft_id))

            expired_count = asyncio.run(
                client.app.state.storage.expire_stale_active_drafts(max_age_hours=24)
            )
            draft = asyncio.run(client.app.state.storage.get_draft(draft_id))

            assert expired_count == 1
            assert draft["status"] == "cancelled"
            assert draft["waiting_for"] is None


def test_stale_active_request_expiration_can_be_disabled() -> None:
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
            asyncio.run(_make_draft_old(client.app.state.storage, draft_id))

            expired_count = asyncio.run(
                client.app.state.storage.expire_stale_active_drafts(max_age_hours=0)
            )
            draft = asyncio.run(client.app.state.storage.get_draft(draft_id))

            assert expired_count == 0
            assert draft["status"] == "collecting"


def test_admin_route_expires_stale_active_request_drafts() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            old_draft_id = asyncio.run(
                client.app.state.storage.create_draft(
                    chat_id=1001,
                    master_id=2002,
                    master_name="Old tester",
                )
            )
            fresh_draft_id = asyncio.run(
                client.app.state.storage.create_draft(
                    chat_id=1001,
                    master_id=3003,
                    master_name="Fresh tester",
                )
            )
            asyncio.run(_make_draft_old(client.app.state.storage, old_draft_id))

            response = client.post("/api/requests/expire-stale")
            old_draft = asyncio.run(client.app.state.storage.get_draft(old_draft_id))
            fresh_draft = asyncio.run(client.app.state.storage.get_draft(fresh_draft_id))

            assert response.status_code == 200
            assert response.json() == {"expired_count": 1, "max_age_hours": 24}
            assert old_draft["status"] == "cancelled"
            assert fresh_draft["status"] == "collecting"


def test_admin_route_rejects_negative_stale_expiration_age() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            response = client.post("/api/requests/expire-stale?max_age_hours=-1")

            assert response.status_code == 400
            assert response.json()["detail"] == "max_age_hours must be non-negative"


def test_admin_route_rejects_invalid_status_transition() -> None:
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
            asyncio.run(client.app.state.storage.set_draft_status(draft_id, status="cancelled"))

            response = client.patch(f"/api/requests/{draft_id}/status", json={"status": "done"})
            draft = asyncio.run(client.app.state.storage.get_draft(draft_id))

            assert response.status_code == 400
            assert "transition is not allowed" in response.json()["detail"]
            assert draft["status"] == "cancelled"


def test_admin_recent_requests_use_storage_summary() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            storage = client.app.state.storage
            asyncio.run(
                storage.upsert_group_profile(
                    {
                        "chat_id": 1001,
                        "title": "Project group",
                        "raw_description": None,
                        "object_name": "Object Alpha",
                        "address": None,
                        "flat": None,
                        "floor": None,
                        "elevator": None,
                        "delivery_rules": None,
                        "delivery_start": None,
                        "delivery_end": None,
                        "delivery_fallback": None,
                    }
                )
            )
            draft_id = asyncio.run(
                storage.create_draft(
                    chat_id=1001,
                    master_id=2002,
                    master_name="Admin tester",
                )
            )
            asyncio.run(
                storage.create_request_item(
                    draft_id=draft_id,
                    family_id=None,
                    variant_id=None,
                    sku_id=None,
                    raw_name="Profiled material",
                    normalized_name="Profiled material",
                    quantity=2,
                    unit="pcs",
                )
            )

            response = client.get("/api/requests/recent", params={"limit": 10})

            assert response.status_code == 200
            row = next(item for item in response.json() if item["id"] == draft_id)
            assert row["object_name"] == "Object Alpha"
            assert row["items_count"] == 1


def test_storage_recent_request_summary_is_typed() -> None:
    with TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        settings = load_settings(_create_settings_file(root))

        with TestClient(create_admin_app(settings)) as client:
            storage = client.app.state.storage
            draft_id = asyncio.run(
                storage.create_draft(
                    chat_id=1001,
                    master_id=2002,
                    master_name="Typed tester",
                )
            )

            summaries = asyncio.run(storage.list_recent_request_summaries(limit=10))
            summary = next(item for item in summaries if item.id == draft_id)

            assert summary.master_name == "Typed tester"
            assert summary.status == "collecting"
            assert summary.items_count == 0
            assert summary.to_api_dict()["id"] == draft_id
