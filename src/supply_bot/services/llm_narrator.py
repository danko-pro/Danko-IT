from __future__ import annotations

import logging

from supply_bot.config import Settings
from supply_bot.services.llm_client import LlmProviderClient
from supply_bot.services.llm_prompt import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

class DialogueNarrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = LlmProviderClient(settings)

    async def humanize_reply(
        self,
        *,
        base_reply: str,
        group_context: str | None = None,
        draft_context: str | None = None,
        recent_chat_context: str | None = None,
    ) -> str:
        if not self.client.enabled:
            return base_reply

        user_prompt = (
            "Project context:\n"
            f"{group_context or 'none'}\n\n"
            "Current request draft:\n"
            f"{draft_context or 'none'}\n\n"
            "Recent chat messages:\n"
            f"{recent_chat_context or 'none'}\n\n"
            "Draft reply to rewrite:\n"
            f"{base_reply}\n\n"
            "Rewrite it so it sounds human, brief, and calm in Russian."
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        for provider in self.client.provider_candidates():
            try:
                result = await self.client.complete_text(messages, provider=provider)
                if result:
                    return result
            except Exception:
                logger.exception("Failed to get LLM response from %s.", provider)
        return base_reply
