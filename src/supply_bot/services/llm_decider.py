from __future__ import annotations

import json
import logging
from typing import Any

from supply_bot.config import Settings
from supply_bot.services.dialogue_contract import DECISION_JSON_SCHEMA, DECISION_SYSTEM_PROMPT
from supply_bot.services.llm_client import LlmProviderClient
from supply_bot.services.llm_support import normalize_decision_payload

logger = logging.getLogger(__name__)

class DialogueDecider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = LlmProviderClient(settings)

    async def decide(
        self,
        *,
        current_message: str,
        group_context: str,
        draft_context: str,
        recent_chat_context: str,
        catalog_context: str,
    ) -> dict[str, Any] | None:
        if not self.client.enabled:
            return None

        user_prompt = (
            "Group context:\n"
            f"{group_context}\n\n"
            "Current draft:\n"
            f"{draft_context}\n\n"
            "Recent chat history:\n"
            f"{recent_chat_context}\n\n"
            "Catalog hints:\n"
            f"{catalog_context}\n\n"
            "Current user message:\n"
            f"{current_message}\n\n"
            "Return a valid JSON decision.\n\n"
            f"Required JSON shape:\n{json.dumps(DECISION_JSON_SCHEMA, ensure_ascii=False)}"
        )
        messages = [
            {"role": "system", "content": DECISION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        for provider in self.client.provider_candidates():
            try:
                result = await self.client.complete_json(messages, provider=provider)
                normalized = normalize_decision_payload(result)
                if normalized:
                    return normalized
            except Exception:
                logger.exception("Failed to get dialogue decision from %s.", provider)
        return None
