from __future__ import annotations

from aiogram import Bot

from supply_bot.services.dialogue_decision_actions import DialogueDecisionActionMixin
from supply_bot.services.dialogue_decision_context import DialogueDecisionContextMixin
from supply_bot.services.dialogue_decision_mutations import DialogueDecisionMutationMixin


class DialogueDecisionMixin(
    DialogueDecisionActionMixin,
    DialogueDecisionContextMixin,
    DialogueDecisionMutationMixin,
):
    async def _try_llm_decision(
        self,
        *,
        bot: Bot,
        profile: dict,
        chat_id: int,
        master_id: int,
        master_name: str,
        text: str,
        draft: dict | None,
        recent_chat_messages: list[dict],
        force_dialogue: bool = False,
    ) -> str | None:
        # Граница LLM-first: модель решает семантику, код только готовит контекст
        # и отсекает явно небезопасные низкоуверенные ответы.
        if not self.settings.llm_enabled:
            return None
        if not force_dialogue and self._is_smalltalk_message(text) and draft is None:
            return None
        if draft is None and not force_dialogue:
            score = self._request_topic_score(text)
            if score < 3 and not (self._is_addressed_to_bot(text) and score >= 2):
                return None
        if self._should_bypass_llm_for_waiting_answer(draft, text):
            return None

        group_context = self._format_group_context(profile)
        draft_context = await self._format_decision_draft_context(draft)
        recent_chat_context = self._format_recent_messages_for_decision(recent_chat_messages)
        catalog_context = await self._format_catalog_context(text)
        decision = await self.decider.decide(
            current_message=text,
            group_context=group_context,
            draft_context=draft_context,
            recent_chat_context=recent_chat_context,
            catalog_context=catalog_context,
        )
        if not decision:
            return None
        decision = self._sanitize_llm_decision(decision, text)

        confidence = float(decision.get("confidence") or 0)
        intent = str(decision.get("intent") or "unknown")
        reply_text = str(decision.get("reply_text") or "").strip()
        actions = decision.get("actions") or []

        if confidence < 0.45 and intent in {"unknown", "offtopic"}:
            return None
        if not actions and intent in {"unknown", "offtopic"}:
            return None

        return await self._apply_llm_decision(
            bot=bot,
            profile=profile,
            chat_id=chat_id,
            master_id=master_id,
            master_name=master_name,
            draft=draft,
            reply_text=reply_text,
            actions=actions,
        )
