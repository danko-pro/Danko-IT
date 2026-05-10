from __future__ import annotations

import json
import logging
from typing import Any

from supply_bot.config import Settings
from supply_bot.projects.access.contract_extraction_support import (
    CONTRACT_EXTRACTION_SCHEMA,
    CONTRACT_EXTRACTION_SYSTEM_PROMPT,
    normalize_contract_payload,
)
from supply_bot.projects.access.contract_extraction_support import (
    extract_contract_text as extract_contract_text,
)
from supply_bot.services.llm_client import LlmProviderClient

logger = logging.getLogger(__name__)

class ProjectContractExtractor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = LlmProviderClient(settings)

    async def extract_contract(self, *, file_name: str, contract_text: str) -> dict[str, Any] | None:
        if not self.client.enabled:
            return None

        trimmed_text = contract_text.strip()
        if not trimmed_text:
            return None

        user_prompt = (
            "Имя файла:\n"
            f"{file_name}\n\n"
            "Текст договора:\n"
            f"{trimmed_text[:24000]}\n\n"
            "Верни только JSON по схеме:\n"
            f"{json.dumps(CONTRACT_EXTRACTION_SCHEMA, ensure_ascii=False)}"
        )
        messages = [
            {"role": "system", "content": CONTRACT_EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        for provider in self.client.provider_candidates():
            try:
                result = await self.client.complete_json(messages, provider=provider)

                normalized = normalize_contract_payload(result)
                if normalized:
                    return normalized
            except Exception:
                logger.exception("Failed to extract contract data via %s.", provider)

        return None
