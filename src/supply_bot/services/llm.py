from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from supply_bot.config import Settings
from supply_bot.services.dialogue_contract import DECISION_JSON_SCHEMA, DECISION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "You are a construction supply coordinator chatting with a foreman in a work chat. "
    "Rewrite the draft reply into natural, concise, human Russian. "
    "Sound like an experienced coordinator, not a form or a helpdesk bot. "
    "Preserve every fact exactly: material names, options, quantities, dates, times, "
    "addresses, constraints, delivery rules, and requested confirmations. "
    "Do not add facts, do not remove required questions, and do not change the meaning. "
    "If the draft asks to choose from options, keep all options. "
    "If the draft asks for a specific confirmation word, keep that instruction. "
    "Ask only one thing at a time unless the draft already asks more than one thing. "
    "Output only the final Russian reply."
)


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
        return _extract_content(data) or messages[-1]["content"]

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
        return _extract_content(data) or messages[-1]["content"]

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
        return _extract_content(data) or messages[-1]["content"]


def _extract_content(payload: dict[str, Any]) -> str | None:
    choices = payload.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        fragments: list[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                fragments.append(str(chunk.get("text", "")))
        text = "".join(fragments).strip()
        return text or None
    return None


class DialogueDecider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def decide(
        self,
        *,
        current_message: str,
        group_context: str,
        draft_context: str,
        recent_chat_context: str,
        catalog_context: str,
    ) -> dict[str, Any] | None:
        if not self.settings.llm_enabled:
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
                normalized = _normalize_decision_payload(result)
                if normalized:
                    return normalized
            except Exception:  # pragma: no cover
                logger.exception("Failed to get dialogue decision from %s.", provider)
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
        data = response.json()
        return _extract_json_content(data)

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
        return _extract_json_content(response.json())

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
        return _extract_json_content(response.json())


def _extract_json_content(payload: dict[str, Any]) -> dict[str, Any] | None:
    content = _extract_content(payload)
    if not content:
        return None
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _normalize_decision_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    actions_in = payload.get("actions")
    actions_out: list[dict[str, Any]] = []
    if isinstance(actions_in, list):
        for action in actions_in:
            if not isinstance(action, dict):
                continue
            action_type = action.get("type") or action.get("action")
            if not isinstance(action_type, str) or not action_type.strip():
                continue
            normalized_action = dict(action)
            normalized_action["type"] = action_type.strip()
            actions_out.append(normalized_action)

    confidence = payload.get("confidence")
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = 0.0

    missing_branches = payload.get("missing_branches")
    if not isinstance(missing_branches, list):
        missing_branches = []

    reply_text = payload.get("reply_text")
    if not isinstance(reply_text, str):
        reply_text = ""

    intent = payload.get("intent")
    if not isinstance(intent, str) or not intent.strip():
        intent = "unknown"

    notes = payload.get("notes")
    if not isinstance(notes, str):
        notes = ""

    loop_detected = payload.get("loop_detected")
    if not isinstance(loop_detected, bool):
        loop_detected = False

    ready_for_confirmation = payload.get("ready_for_confirmation")
    if not isinstance(ready_for_confirmation, bool):
        ready_for_confirmation = False

    return {
        "reply_text": reply_text.strip(),
        "intent": intent.strip(),
        "confidence": max(0.0, min(1.0, confidence_value)),
        "loop_detected": loop_detected,
        "actions": actions_out,
        "missing_branches": [str(branch) for branch in missing_branches],
        "ready_for_confirmation": ready_for_confirmation,
        "notes": notes.strip(),
    }
