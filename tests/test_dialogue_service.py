from __future__ import annotations

from datetime import date, datetime, time
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from zoneinfo import ZoneInfo

from supply_bot.constants import AFFIRMATIVE_WORDS
from supply_bot.services.dialogue import RequestDialogueService


class FakeStorage:
    def __init__(self) -> None:
        self.status_updates: list[tuple[int, str]] = []
        self.waiting_updates: list[tuple[int, dict]] = []
        self.delivery_updates: list[tuple[int, dict]] = []
        self.items: list[dict] = []
        self.drafts: dict[int, dict] = {}
        self.created_drafts: list[dict] = []

    async def set_draft_status(self, draft_id: int, *, status: str) -> None:
        self.status_updates.append((draft_id, status))
        self.drafts.setdefault(draft_id, {"id": draft_id})["status"] = status

    async def list_request_items(self, draft_id: int) -> list[dict]:
        return list(self.items)

    async def update_draft_waiting(self, draft_id: int, **kwargs) -> None:
        self.waiting_updates.append((draft_id, dict(kwargs)))
        self.drafts.setdefault(draft_id, {"id": draft_id}).update(kwargs)

    async def update_draft_delivery(self, draft_id: int, **kwargs) -> None:
        self.delivery_updates.append((draft_id, dict(kwargs)))
        self.drafts.setdefault(draft_id, {"id": draft_id}).update(kwargs)

    async def get_draft(self, draft_id: int) -> dict:
        return dict(self.drafts.get(draft_id, {"id": draft_id}))

    async def get_or_create_active_draft(
        self,
        *,
        chat_id: int,
        master_id: int,
        master_name: str,
    ) -> dict:
        draft = self.drafts.setdefault(
            99,
            {
                "id": 99,
                "chat_id": chat_id,
                "master_id": master_id,
                "master_name": master_name,
            },
        )
        self.created_drafts.append(dict(draft))
        return dict(draft)


class TestDialogueService(RequestDialogueService):
    def __init__(self, storage: FakeStorage) -> None:
        self.settings = SimpleNamespace(admin_ids=[], timezone="Europe/Berlin", llm_enabled=False)
        self.storage = storage
        self.narrator = None
        self.decider = None
        self.profiles = None
        self.now_dt = datetime(2026, 4, 12, 12, 0, tzinfo=ZoneInfo("Europe/Berlin"))
        self.narrated: list[str] = []
        self.notified: list[tuple[str, dict]] = []
        self.confirmation_correction_reply: str | None = None
        self.material_analysis: dict[str, tuple[list[dict], list[str]]] = {}
        self.handle_material_matches_reply = "handled"
        self.missing_branches: list[str] = []

    async def _narrate(self, base_reply: str, profile: dict, draft: dict) -> str:
        self.narrated.append(base_reply)
        return base_reply

    async def _notify_admins(self, bot, summary: str, draft: dict) -> None:
        self.notified.append((summary, dict(draft)))

    async def _collect_missing_branches(self, draft: dict, items: list[dict]) -> list[str]:
        return list(self.missing_branches)

    async def _handle_confirmation_correction(self, profile: dict, draft: dict, text: str) -> str | None:
        return self.confirmation_correction_reply

    async def _analyze_material_mentions(self, text: str) -> tuple[list[dict], list[str]]:
        return self.material_analysis.get(text, ([], []))

    async def _handle_material_matches(
        self,
        profile: dict,
        draft: dict,
        text: str,
        matches: list[dict],
        unknown_segments: list[str],
    ) -> str:
        return self.handle_material_matches_reply

    async def _reply_for_unknown_segments(
        self,
        profile: dict,
        draft: dict,
        unknown_segments: list[str],
        text: str,
    ) -> str:
        return "unknown"

    def _now(self) -> datetime:
        return self.now_dt


class DialogueServiceTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.storage = FakeStorage()
        self.service = TestDialogueService(self.storage)
        self.profile = {
            "title": "Объект",
            "object_name": "Объект",
            "delivery_start": "09:00",
            "delivery_end": "18:00",
            "delivery_fallback": "10:00",
        }

    async def test_confirmation_affirmative_confirms_draft_and_notifies(self) -> None:
        draft = {
            "id": 1,
            "waiting_for": "confirmation",
            "master_name": "Мастер",
            "confirmed_delivery_date": "2026-04-13",
            "confirmed_delivery_time": "11:00",
        }

        affirmative = next(iter(AFFIRMATIVE_WORDS))
        result = await self.service._handle_confirmation(object(), self.profile, draft, affirmative, affirmative)

        self.assertIsNotNone(result)
        self.assertEqual(self.storage.status_updates, [(1, "confirmed")])
        self.assertEqual(len(self.service.notified), 1)

    async def test_confirmation_correction_uses_correction_flow(self) -> None:
        draft = {"id": 2, "waiting_for": "confirmation"}
        self.service.confirmation_correction_reply = "исправил позицию"

        result = await self.service._handle_confirmation(
            object(), self.profile, draft, "исправь саморезы", "исправь саморезы"
        )

        self.assertIsNotNone(result)
        self.assertEqual(result.text, "исправил позицию")

    async def test_validate_delivery_out_of_range_creates_proposal(self) -> None:
        reply = await self.service._validate_and_finalize_delivery(
            self.profile,
            3,
            date(2026, 4, 13),
            time(7, 0),
        )

        self.assertTrue(reply)
        self.assertEqual(len(self.storage.waiting_updates), 1)
        draft_id, payload = self.storage.waiting_updates[0]
        self.assertEqual(draft_id, 3)
        self.assertEqual(payload["waiting_for"], "delivery_proposal")
        self.assertEqual(payload["proposed_delivery_date"], "2026-04-13")
        self.assertEqual(payload["proposed_delivery_time"], "10:00")

    async def test_validate_delivery_valid_slot_confirms_delivery(self) -> None:
        self.storage.drafts[4] = {"id": 4}

        reply = await self.service._validate_and_finalize_delivery(
            self.profile,
            4,
            date(2026, 4, 13),
            time(11, 0),
        )

        self.assertTrue(reply)
        self.assertEqual(len(self.storage.delivery_updates), 1)
        _, delivery_payload = self.storage.delivery_updates[0]
        self.assertEqual(delivery_payload["confirmed_date"], "2026-04-13")
        self.assertEqual(delivery_payload["confirmed_time"], "11:00")
        self.assertEqual(delivery_payload["status"], "awaiting_confirmation")
        self.assertEqual(self.storage.waiting_updates[-1][1]["waiting_for"], "confirmation")

    async def test_contextual_restore_uses_recent_material_context(self) -> None:
        current_text = "danko_ai_bot еще 20 листов"
        basis_text = "гкл"
        combined_text = f"{basis_text}, {current_text}"
        match = {"family_id": 1, "alias": "гкл"}
        self.service.material_analysis = {
            basis_text: ([match], []),
            combined_text: ([match], []),
        }
        self.service.handle_material_matches_reply = "восстановил заявку"

        reply = await self.service._handle_contextual_start(
            profile=self.profile,
            chat_id=10,
            master_id=20,
            master_name="Мастер",
            text=current_text,
            recent_self_messages=[{"text": basis_text}, {"text": current_text}],
            recent_chat_messages=[{"text": basis_text}, {"text": current_text}],
        )

        self.assertEqual(reply, "восстановил заявку")
        self.assertEqual(len(self.storage.created_drafts), 1)
