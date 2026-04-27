from __future__ import annotations

import logging
from typing import Any

import httpx

from supply_bot.config import Settings
from supply_bot.services.llm_prompt import SYSTEM_PROMPT
from supply_bot.services.llm_support import extract_content

logger = logging.getLogger(__name__)

class DialogueNarrator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def humanize_reply(
        self,
        *,
        base_reply: str,
        group_context: str | None = None,
        draft_context: str | None = None,
        recent_chat_context: str | None = None,
    ) -> str:
        if not self.settings.llm_enabled:
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

        for provider in self._provider_candidates():
            try:
                if provider == "openai":
                    return await self._call_openai(messages)
                if provider == "mistral":
                    return await self._call_mistral(messages)
                if provider == "openrouter":
                    return await self._call_openrouter(messages)
            except Exception:  # pragma: no cover
                logger.exception("Failed to get LLM response from %s.", provider)
        return base_reply

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

    async def _call_mistral(self, messages: list[dict[str, str]]) -> str:
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
        data = response.json()
        return extract_content(data) or messages[-1]["content"]

    async def _call_openrouter(self, messages: list[dict[str, str]]) -> str:
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
        data = response.json()
        return extract_content(data) or messages[-1]["content"]

    async def _call_openai(self, messages: list[dict[str, str]]) -> str:
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.supply_dialogue_model,
            "messages": messages,
            "reasoning_effort": self.settings.supply_dialogue_reasoning_effort,
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await client.post(
                f"{self.settings.openai_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        data = response.json()
        return extract_content(data) or messages[-1]["content"]
