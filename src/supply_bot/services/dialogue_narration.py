from __future__ import annotations

from supply_bot.utils import normalize_text


class DialogueNarrationMixin:
    async def _narrate(self, base_reply: str, profile: dict, draft: dict | None) -> str:
        if not self._should_humanize(base_reply):
            return base_reply
        resolved_draft = draft
        if draft and "chat_id" not in draft and "id" in draft:
            resolved_draft = await self.storage.get_draft(draft["id"])
        group_context = self._format_group_context(profile)
        draft_context = await self._format_draft_context(resolved_draft) if resolved_draft else None
        recent_chat_context = None
        if resolved_draft and resolved_draft.get("chat_id"):
            recent_chat_context = await self._format_recent_chat_context(resolved_draft["chat_id"])
        return await self.narrator.humanize_reply(
            base_reply=base_reply,
            group_context=group_context,
            draft_context=draft_context,
            recent_chat_context=recent_chat_context,
        )

    def _should_humanize(self, base_reply: str) -> bool:
        normalized = normalize_text(base_reply)
        if not normalized:
            return False
        hard_markers = (
            "проверьте, пожалуйста, заявку",
            "если всё верно, напишите",
            "напишите 'подтверждаю'",
            "напишите 'да'",
            "напишите 'нет'",
            "объект:",
            "позиции:",
            "доставка:",
            "новая подтверждённая заявка",
            "новая подтвержденная заявка",
        )
        if any(marker in normalized for marker in hard_markers):
            return False
        if "\n" not in base_reply:
            return True
        if len(base_reply) <= 160:
            return True
        if "\n" in base_reply or "?" in base_reply:
            return False

        normalized = normalize_text(base_reply)
        structured_markers = (
            "правильно понял",
            "сколько нужно",
            "сколько листов",
            "какая толщина",
            "какой размер",
            "нужна толщина",
            "напишите размер",
            "нужно количество",
            "день и время доставки",
            "точное время доставки",
            "в это время доставка не работает",
            "проверьте, пожалуйста, заявку",
            "если всё верно",
            "напишите один из вариантов",
            "пока не до конца понял позицию",
            "по позиции",
            "пока не нашёл в каталоге",
            "напишите да",
            "напишите нет",
        )
        return not any(marker in normalized for marker in structured_markers)

    def _format_group_context(self, profile: dict) -> str:
        parts = [profile.get("title") or ""]
        parts.append(f"current_date: {self._today().isoformat()}")
        parts.append(f"timezone: {self.settings.timezone}")
        if profile.get("address"):
            parts.append(f"адрес: {profile['address']}")
        if profile.get("flat"):
            parts.append(f"кв: {profile['flat']}")
        if profile.get("floor"):
            parts.append(f"этаж: {profile['floor']}")
        if profile.get("elevator"):
            parts.append(f"лифт: {profile['elevator']}")
        if profile.get("delivery_rules"):
            parts.append(profile["delivery_rules"])
        if profile.get("delivery_start") and profile.get("delivery_end"):
            parts.append(
                f"delivery window: {profile['delivery_start']}-{profile['delivery_end']}, "
                f"suggested slot: {profile.get('delivery_fallback') or 'not specified'}"
            )
        return "; ".join(part for part in parts if part)

    async def _format_draft_context(self, draft: dict) -> str:
        if not draft or "id" not in draft:
            return "черновик без деталей"
        saved_draft = await self.storage.get_draft(draft["id"])
        if saved_draft is None:
            return "черновик не найден"
        items = await self.storage.list_request_items(saved_draft["id"])
        if not items:
            return "позиций пока нет"
        return "; ".join(self._format_item(item) for item in items)

    async def _format_recent_chat_context(self, chat_id: int, *, limit: int = 6) -> str:
        messages = await self.storage.list_recent_group_messages(chat_id=chat_id, limit=limit)
        if not messages:
            return "no recent chat"
        lines = []
        for message in messages:
            author = message.get("user_name") or str(message.get("user_id"))
            lines.append(f"{author}: {message['text']}")
        return "\n".join(lines)
