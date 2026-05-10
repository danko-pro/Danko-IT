from __future__ import annotations

from typing import Any

import httpx

from supply_bot.config import Settings
from supply_bot.services.llm_support import extract_content, extract_json_content


class LlmProviderClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return self.settings.supply_dialogue_enabled and bool(self.provider_candidates())

    def provider_candidates(self) -> list[str]:
        primary = self.settings.supply_dialogue_primary_provider.lower()
        providers = [primary]
        for candidate in ("openai", "mistral", "openrouter"):
            if candidate not in providers:
                providers.append(candidate)
        return [provider for provider in providers if self._provider_has_key(provider)]

    async def complete_text(self, messages: list[dict[str, str]], *, provider: str) -> str | None:
        payload = await self._post_chat_completion(provider, messages, json_response=False)
        return extract_content(payload)

    async def complete_json(self, messages: list[dict[str, str]], *, provider: str) -> dict[str, Any] | None:
        payload = await self._post_chat_completion(provider, messages, json_response=True)
        return extract_json_content(payload)

    def _provider_has_key(self, provider: str) -> bool:
        if provider == "openai":
            return bool(self.settings.openai_api_key)
        if provider == "mistral":
            return bool(self.settings.mistral_api_key)
        if provider == "openrouter":
            return bool(self.settings.openrouter_api_key)
        return False

    def _provider_auth_token(self, provider: str) -> str:
        if provider == "openai":
            return str(self.settings.openai_api_key)
        if provider == "mistral":
            return str(self.settings.mistral_api_key)
        if provider == "openrouter":
            return str(self.settings.openrouter_api_key)
        raise ValueError(f"Unsupported LLM provider: {provider}")

    def _provider_base_url(self, provider: str) -> str:
        if provider == "openai":
            return self.settings.openai_base_url.rstrip("/")
        if provider == "mistral":
            return self.settings.mistral_base_url.rstrip("/")
        if provider == "openrouter":
            return self.settings.openrouter_base_url.rstrip("/")
        raise ValueError(f"Unsupported LLM provider: {provider}")

    def _chat_payload(
        self,
        provider: str,
        messages: list[dict[str, str]],
        *,
        json_response: bool,
    ) -> dict[str, Any]:
        if provider == "mistral":
            return {
                "model": self.settings.supply_dialogue_mistral_model,
                "messages": messages,
                "max_tokens": self.settings.supply_dialogue_mistral_max_output_tokens,
            }

        if provider == "openrouter":
            return {
                "model": self.settings.supply_dialogue_model,
                "messages": messages,
                "max_tokens": self.settings.supply_dialogue_max_output_tokens,
            }

        if provider == "openai":
            payload: dict[str, Any] = {
                "model": self.settings.supply_dialogue_model,
                "messages": messages,
                "reasoning_effort": self.settings.supply_dialogue_reasoning_effort,
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}
            return payload

        raise ValueError(f"Unsupported LLM provider: {provider}")

    async def _post_chat_completion(
        self,
        provider: str,
        messages: list[dict[str, str]],
        *,
        json_response: bool,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._provider_auth_token(provider)}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await client.post(
                f"{self._provider_base_url(provider)}/chat/completions",
                headers=headers,
                json=self._chat_payload(provider, messages, json_response=json_response),
            )
            response.raise_for_status()
        return response.json()
