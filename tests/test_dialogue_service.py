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
        self.group_messages: list[dict] = []
        self.participants: set[tuple[int, int]] = set()
        self.expire_calls: list[dict] = []

    async def add_group_message(
        self,
        *,
        chat_id: int,
        user_id: int,
        user_name: str,
        text: str,
        message_id: int | None = None,
    ) -> None:
        self.group_messages.append(
            {
                "chat_id": chat_id,
                "user_id": user_id,
                "user_name": user_name,
                "text": text,
                "message_id": message_id,
            }
        )

    async def get_active_draft_for_chat(self, *, chat_id: int) -> dict | None:
        for draft in reversed(list(self.drafts.values())):
            if draft.get("chat_id") == chat_id and draft.get("status") in {"collecting", "awaiting_confirmation"}:
                return dict(draft)
        return None

    async def expire_stale_active_drafts(self, *, max_age_hours: int, chat_id: int | None = None) -> int:
        self.expire_calls.append({"max_age_hours": max_age_hours, "chat_id": chat_id})
        return 0

    async def get_active_draft(self, *, chat_id: int, master_id: int) -> dict | None:
        for draft in reversed(list(self.drafts.values())):
            if (
                draft.get("chat_id") == chat_id
                and draft.get("master_id") == master_id
                and draft.get("status") in {"collecting", "awaiting_confirmation"}
            ):
                return dict(draft)
        return None

    async def list_recent_group_messages(
        self,
        *,
        chat_id: int,
        user_id: int | None = None,
        limit: int = 6,
    ) -> list[dict]:
        messages = [message for message in self.group_messages if message["chat_id"] == chat_id]
        if user_id is not None:
            messages = [message for message in messages if message["user_id"] == user_id]
        return messages[-limit:]

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
        await self.add_draft_participant(
            draft_id=draft["id"],
            user_id=master_id,
            user_name=master_name,
            role="owner",
        )
        return dict(draft)

    async def add_draft_participant(
        self,
        *,
        draft_id: int,
        user_id: int,
        user_name: str | None,
        role: str = "participant",
    ) -> None:
        self.participants.add((draft_id, user_id))

    async def is_draft_participant(self, *, draft_id: int, user_id: int) -> bool:
        return (draft_id, user_id) in self.participants


class DialogueServiceHarness(RequestDialogueService):
    def __init__(self, storage: FakeStorage) -> None:
        self.settings = SimpleNamespace(
            admin_ids=[],
            timezone="Europe/Berlin",
            llm_enabled=False,
            request_draft_stale_hours=24,
        )
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


class FakeProfiles:
    def __init__(self, profile: dict) -> None:
        self.profile = profile

    async def sync_from_telegram(self, bot, chat_id: int) -> dict:
        return dict(self.profile)


class DialogueServiceTests(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.storage = FakeStorage()
        self.service = DialogueServiceHarness(self.storage)
        self.profile = {
            "title": "Объект",
            "object_name": "Объект",
            "delivery_start": "09:00",
            "delivery_end": "18:00",
            "delivery_fallback": "10:00",
        }
        self.service.profiles = FakeProfiles(self.profile)

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

    async def test_explicit_cancel_phrase_closes_own_active_draft(self) -> None:
        self.storage.drafts[5] = {
            "id": 5,
            "chat_id": 10,
            "master_id": 20,
            "master_name": "Мастер",
            "status": "collecting",
        }
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Мастер", username="master", is_bot=False),
            message_id=50,
        )

        result = await self.service.handle_group_text_payload(object(), message, text="отмена заявки")

        self.assertEqual(self.storage.status_updates, [(5, "cancelled")])
        self.assertEqual(
            result.text,
            "Понял, это не рабочая заявка. Черновик закрыл. "
            "Если понадобится, просто напишите материал и количество одной фразой.",
        )

    async def test_explicit_cancel_phrase_for_foreign_draft_does_not_stay_silent(self) -> None:
        self.storage.drafts[6] = {
            "id": 6,
            "chat_id": 10,
            "master_id": 99,
            "master_name": "Другой мастер",
            "status": "collecting",
        }
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Мастер", username="master", is_bot=False),
            message_id=51,
        )

        result = await self.service.handle_group_text_payload(object(), message, text="отмена заявки")

        self.assertEqual(self.storage.status_updates, [])
        self.assertIsNotNone(result.text)
        self.assertIn("Другой мастер", result.text)

    async def test_possible_cancel_phrase_does_not_become_waiting_comment(self) -> None:
        draft = {"id": 7, "waiting_for": "comment"}

        bypass = self.service._should_bypass_llm_for_waiting_answer(draft, "передумал, не оформляй")

        self.assertFalse(bypass)

    async def test_negative_item_correction_is_not_whole_request_cancel(self) -> None:
        self.assertFalse(self.service._is_abort_request_message("не влагостойкий, нужен обычный"))
        self.assertFalse(self.service._is_possible_abort_request_message("не влагостойкий, нужен обычный"))

    async def test_bot_address_accepts_human_and_telegram_names(self) -> None:
        self.assertTrue(self.service._is_addressed_to_bot("Данко, нужна заявка"))
        self.assertTrue(self.service._is_addressed_to_bot("@Danko_ai_bot привези цемент"))

    async def test_unaddressed_direct_order_can_start_dialogue(self) -> None:
        text = "привези цемент 10 мешков"
        match = {"family_id": 1, "alias": "цемент"}
        self.service.material_analysis = {text: ([match], [])}
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Мастер", username="master", is_bot=False),
            message_id=52,
        )

        result = await self.service.handle_group_text_payload(object(), message, text=text)

        self.assertEqual(result.text, "handled")
        self.assertEqual(len(self.storage.created_drafts), 1)

    async def test_unaddressed_direct_order_with_standalone_number_is_ignored(self) -> None:
        text = "привези ключи через 10 минут"
        self.service.material_analysis = {text: ([], ["ключи через 10 минут"])}
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Мастер", username="master", is_bot=False),
            message_id=53,
        )

        result = await self.service.handle_group_text_payload(object(), message, text=text)

        self.assertIsNone(result.text)
        self.assertEqual(self.storage.created_drafts, [])

    async def test_unaddressed_unknown_material_does_not_create_manual_item(self) -> None:
        text = "привези штуки 10 шт"
        self.service.material_analysis = {text: ([], ["штуки 10 шт"])}
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Мастер", username="master", is_bot=False),
            message_id=54,
        )

        result = await self.service.handle_group_text_payload(object(), message, text=text)

        self.assertIsNone(result.text)
        self.assertEqual(self.storage.created_drafts, [])

    async def test_foreign_noise_during_active_draft_is_ignored(self) -> None:
        self.storage.drafts[8] = {
            "id": 8,
            "chat_id": 10,
            "master_id": 99,
            "master_name": "Автор",
            "status": "collecting",
        }
        self.storage.participants.add((8, 99))
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Сосед", username="neighbor", is_bot=False),
            message_id=55,
        )

        result = await self.service.handle_group_text_payload(object(), message, text="кто завтра на объекте?")

        self.assertIsNone(result.text)
        self.assertEqual(self.storage.group_messages, [])
        self.assertNotIn((8, 20), self.storage.participants)

    async def test_owner_side_chat_during_active_draft_is_ignored(self) -> None:
        self.storage.drafts[11] = {
            "id": 11,
            "chat_id": 10,
            "master_id": 20,
            "master_name": "Автор",
            "status": "collecting",
        }
        self.storage.participants.add((11, 20))
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Автор", username="owner", is_bot=False),
            message_id=58,
        )

        result = await self.service.handle_group_text_payload(object(), message, text="кто завтра на объекте?")

        self.assertIsNone(result.text)
        self.assertEqual(self.storage.group_messages, [])

    async def test_active_draft_filter_allows_waiting_quantity_answer_only_when_clean(self) -> None:
        draft = {"id": 12, "waiting_for": "quantity"}

        self.assertTrue(self.service._should_process_active_draft_message("10", draft))
        self.assertTrue(self.service._should_process_active_draft_message("10 мешков", draft))
        self.assertFalse(self.service._should_process_active_draft_message("10 минут", draft))

    async def test_active_draft_filter_separates_delivery_answer_from_side_question(self) -> None:
        draft = {"id": 13, "waiting_for": None}

        self.assertTrue(self.service._should_process_active_draft_message("завтра в 12:00", draft))
        self.assertFalse(self.service._should_process_active_draft_message("кто завтра на объекте?", draft))

    async def test_foreign_addressed_smalltalk_during_active_draft_is_ignored(self) -> None:
        self.storage.drafts[9] = {
            "id": 9,
            "chat_id": 10,
            "master_id": 99,
            "master_name": "Автор",
            "status": "collecting",
        }
        self.storage.participants.add((9, 99))
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Сосед", username="neighbor", is_bot=False),
            message_id=56,
        )

        result = await self.service.handle_group_text_payload(object(), message, text="Данко, как дела?")

        self.assertIsNone(result.text)
        self.assertEqual(self.storage.group_messages, [])
        self.assertNotIn((9, 20), self.storage.participants)

    async def test_foreign_user_can_join_active_draft_with_explicit_request_message(self) -> None:
        text = "Данко, добавь цемент 10 мешков"
        self.storage.drafts[10] = {
            "id": 10,
            "chat_id": 10,
            "master_id": 99,
            "master_name": "Автор",
            "status": "collecting",
        }
        self.storage.participants.add((10, 99))
        self.service.material_analysis = {text: ([{"family_id": 1, "alias": "цемент"}], [])}
        message = SimpleNamespace(
            chat=SimpleNamespace(id=10),
            from_user=SimpleNamespace(id=20, full_name="Помощник", username="helper", is_bot=False),
            message_id=57,
        )

        result = await self.service.handle_group_text_payload(object(), message, text=text)

        self.assertEqual(result.text, "handled")
        self.assertIn((10, 20), self.storage.participants)
        self.assertEqual(self.storage.created_drafts, [])
