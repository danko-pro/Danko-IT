from __future__ import annotations

from aiogram import Bot

from supply_bot.constants import AFFIRMATIVE_WORDS, NEGATIVE_WORDS
from supply_bot.services.dialogue_contract import DialogueResult
from supply_bot.utils import format_date


class DialogueConfirmationMixin:
    async def _build_progress_summary(self, draft: dict, profile: dict) -> str:
        items = await self.storage.list_request_items(draft["id"])
        if not items:
            return "Пока в заявке ничего не записано."
        lines = [
            "Сейчас в заявке:",
            f"Объект: {profile.get('object_name') or profile.get('title')}",
        ]
        for index, item in enumerate(items, start=1):
            lines.append(f"{index}. {self._format_item(item)}")
        if draft.get("confirmed_delivery_date") and draft.get("confirmed_delivery_time"):
            lines.append(
                "Доставка: "
                f"{format_date(draft.get('confirmed_delivery_date'))} "
                f"к {draft.get('confirmed_delivery_time')}"
            )
        elif draft.get("requested_delivery_date") or draft.get("requested_delivery_time"):
            lines.append(
                "Доставка пока в работе: "
                f"{format_date(draft.get('requested_delivery_date'))} "
                f"к {draft.get('requested_delivery_time') or 'не указано'}"
            )
        else:
            lines.append("Доставка пока не указана.")
        next_question = await self._next_summary_follow_up(draft, items)
        if next_question:
            lines.append(next_question)
        return "\n".join(lines)

    async def _next_summary_follow_up(self, draft: dict, items: list[dict]) -> str | None:
        missing_branches = await self._collect_missing_branches(draft, items)
        if not missing_branches:
            return None
        if "item_variant" in missing_branches:
            return "Уточните, пожалуйста, по какой позиции ещё нужен вариант материала."
        if "item_quantity" in missing_branches:
            return "Напишите, пожалуйста, чего и сколько ещё нужно по заявке."
        if "item_specs" in missing_branches:
            return "Нужно ещё уточнить характеристики по одной из позиций."
        if "delivery_date" in missing_branches or "delivery_time" in missing_branches:
            return "Напишите, пожалуйста, день и время доставки."
        if "confirmation" in missing_branches:
            return "Если всё верно, напишите 'подтверждаю'."
        return None

    async def _handle_confirmation(
        self,
        bot: Bot,
        profile: dict,
        draft: dict,
        text: str,
        normalized_text: str,
    ) -> DialogueResult | None:
        waiting_for = draft.get("waiting_for")
        if waiting_for == "confirmation":
            if normalized_text in AFFIRMATIVE_WORDS:
                await self.storage.set_draft_status(draft["id"], status="confirmed")
                summary = await self._build_summary(draft, profile)
                await self._notify_admins(bot, summary, draft)
                base_reply = "Отлично, заявку зафиксировал и уже отправил администратору."
                return DialogueResult(text=await self._narrate(base_reply, profile, draft))
            if normalized_text in NEGATIVE_WORDS:
                await self.storage.update_draft_waiting(draft["id"], waiting_for=None, status="collecting")
                base_reply = "Хорошо, тогда напишите, что поправить или какую позицию добавить."
                return DialogueResult(text=await self._narrate(base_reply, profile, draft))
            correction_reply = await self._handle_confirmation_correction(profile, draft, text)
            if correction_reply is not None:
                return DialogueResult(text=correction_reply)
            base_reply = "Если всё верно, напишите 'подтверждаю'. Если нужно исправить заявку, напишите 'нет'."
            return DialogueResult(text=await self._narrate(base_reply, profile, draft))

        if waiting_for == "delivery_proposal":
            if normalized_text in AFFIRMATIVE_WORDS:
                await self.storage.update_draft_delivery(
                    draft["id"],
                    confirmed_date=draft.get("proposed_delivery_date"),
                    confirmed_time=draft.get("proposed_delivery_time"),
                    status="awaiting_confirmation",
                )
                await self.storage.update_draft_waiting(draft["id"], waiting_for="confirmation")
                summary = await self._build_summary(draft, profile, use_proposed=True)
                return DialogueResult(text=await self._narrate(summary, profile, draft))
            if normalized_text in NEGATIVE_WORDS:
                await self.storage.update_draft_waiting(
                    draft["id"],
                    waiting_for=None,
                    proposed_delivery_date=None,
                    proposed_delivery_time=None,
                    status="collecting",
                )
                base_reply = "Тогда напишите удобный день и время доставки в рабочем интервале."
                return DialogueResult(text=await self._narrate(base_reply, profile, draft))
            if self._parse_delivery(text) is None:
                proposed_date = format_date(draft.get("proposed_delivery_date"))
                proposed_time = draft.get("proposed_delivery_time") or "не указано"
                base_reply = (
                    f"Напишите 'да', если подходит слот {proposed_date} к {proposed_time}, "
                    "или укажите другой день и время."
                )
                return DialogueResult(text=await self._narrate(base_reply, profile, draft))

        return None

    async def _handle_waiting_state(
        self,
        profile: dict,
        draft: dict,
        text: str,
    ) -> DialogueResult | None:
        waiting_for = draft.get("waiting_for")
        waiting_item_id = draft.get("waiting_item_id")

        if waiting_for == "manual_item_description" and waiting_item_id:
            reply = await self._apply_manual_item_answer(profile, draft, waiting_item_id, text)
            return DialogueResult(text=reply)

        if self._has_additional_material_intent(text):
            reply = await self._handle_unknown_or_additional_materials(profile, draft, text)
            if reply is not None:
                return DialogueResult(text=reply)

        if waiting_item_id and waiting_for in {"variant", "thickness_mm", "size", "quantity", "comment"}:
            reply = await self._apply_item_answer(profile, draft, waiting_item_id, waiting_for, text)
            return DialogueResult(text=reply)
        return None
