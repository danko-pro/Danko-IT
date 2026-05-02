from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from supply_bot.config import Settings
from supply_bot.projects.access.contract_extraction_support import (
    CONTRACT_EXTRACTION_SCHEMA,
    CONTRACT_EXTRACTION_SYSTEM_PROMPT,
    extract_json_content,
    normalize_contract_payload,
)
from supply_bot.projects.access.contract_extraction_support import (
    extract_contract_text as extract_contract_text,
)

logger = logging.getLogger(__name__)

class ProjectContractExtractor:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def extract_contract(self, *, file_name: str, contract_text: str) -> dict[str, Any] | None:
        if not self.settings.llm_enabled:
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

        for provider in self._provider_candidates():
            try:
                if provider == "openai":
                    result = await self._call_openai_json(messages)
                elif provider == "mistral":
                    result = await self._call_mistral_json(messages)
                elif provider == "openrouter":
                    result = await self._call_openrouter_json(messages)
                else:
                    continue

                normalized = normalize_contract_payload(result)
                if normalized:
                    return normalized
            except Exception:  # pragma: no cover
                logger.exception("Failed to extract contract data via %s.", provider)

        return None

    def _provider_candidates(self) -> list[str]:
        primary = self.settings.supply_dialogue_primary_provider.lower()
        providers = [primary]
        for candidate in ("openai", "mistral", "openrouter"):
            if candidate not in providers:
                providers.append(candidate)
        return [provider for provider in providers if self._provider_has_key(provider)]

    def _provider_has_key(self, provider: str) -> bool:
        if provider == "openai":
            return bool(self.settings.openai_api_key)
        if provider == "mistral":
            return bool(self.settings.mistral_api_key)
        if provider == "openrouter":
            return bool(self.settings.openrouter_api_key)
        return False

    async def _call_openai_json(self, messages: list[dict[str, str]]) -> dict[str, Any] | None:
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.supply_dialogue_model,
            "messages": messages,
            "reasoning_effort": self.settings.supply_dialogue_reasoning_effort,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.openai_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        return extract_json_content(response.json())

    async def _call_mistral_json(self, messages: list[dict[str, str]]) -> dict[str, Any] | None:
        headers = {
            "Authorization": f"Bearer {self.settings.mistral_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.settings.supply_dialogue_mistral_model,
            "messages": messages,
            "max_tokens": self.settings.supply_dialogue_mistral_max_output_tokens,
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.mistral_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        return extract_json_content(response.json())

    async def _call_openrouter_json(self, messages: list[dict[str, str]]) -> dict[str, Any] | None:
        headers = {
            "Authorization": f"Bearer {self.settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.supply_dialogue_model,
            "messages": messages,
            "max_tokens": self.settings.supply_dialogue_max_output_tokens,
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.openrouter_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        return extract_json_content(response.json())
