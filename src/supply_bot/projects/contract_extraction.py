from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import httpx

from supply_bot.config import Settings

logger = logging.getLogger(__name__)

CONTRACT_EXTRACTION_SCHEMA = {
    "title": "string",
    "number": "string",
    "signed_at": "YYYY-MM-DD or empty string",
    "start_date": "YYYY-MM-DD or empty string",
    "planned_end_date": "YYYY-MM-DD or empty string",
    "amount": "number",
    "advance_terms": "string",
    "milestones": [
        {
            "kind": "invoice | payment | deadline",
            "title": "string",
            "planned_date": "YYYY-MM-DD",
            "amount": "number | null",
            "note": "string",
        }
    ],
}

CONTRACT_EXTRACTION_SYSTEM_PROMPT = (
    "You extract structured data from a construction contract. "
    "Return only valid JSON. "
    "Do not invent facts that are not present in the document. "
    "If a date or amount is missing, return an empty string or 0/null. "
    "Milestones should include invoice dates, payment dates, and key deadlines if they are explicitly stated. "
    "Output concise Russian strings when the contract is in Russian."
)


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

                normalized = _normalize_contract_payload(result)
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
        return _extract_json_content(response.json())

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


def extract_contract_text(file_path: Path, *, mime_type: str | None = None) -> str:
    suffix = file_path.suffix.lower()
    if mime_type == "application/pdf" or suffix == ".pdf":
        from pypdf import PdfReader

        reader = PdfReader(str(file_path))
        parts: list[str] = []
        for page in reader.pages[:50]:
            text = page.extract_text() or ""
            stripped = text.strip()
            if stripped:
                parts.append(stripped)
        return "\n\n".join(parts)

    raw_bytes = file_path.read_bytes()
    for encoding in ("utf-8", "cp1251", "latin-1"):
        try:
            return raw_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw_bytes.decode("utf-8", errors="ignore")


def _extract_json_content(payload: dict[str, Any]) -> dict[str, Any] | None:
    choices = payload.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    text: str | None = None
    if isinstance(content, str):
        text = content.strip()
    elif isinstance(content, list):
        fragments: list[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                fragments.append(str(chunk.get("text", "")))
        text = "".join(fragments).strip()

    if not text:
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _normalize_contract_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    milestones_in = payload.get("milestones")
    milestones_out: list[dict[str, Any]] = []
    if isinstance(milestones_in, list):
        for milestone in milestones_in:
            if not isinstance(milestone, dict):
                continue
            title = str(milestone.get("title") or "").strip()
            planned_date = str(milestone.get("planned_date") or "").strip()
            if not title or not planned_date:
                continue
            amount_raw = milestone.get("amount")
            try:
                amount_value = float(amount_raw) if amount_raw is not None else None
            except (TypeError, ValueError):
                amount_value = None
            milestones_out.append(
                {
                    "kind": str(milestone.get("kind") or "deadline").strip().lower(),
                    "title": title,
                    "planned_date": planned_date,
                    "amount": amount_value,
                    "note": str(milestone.get("note") or "").strip(),
                }
            )

    try:
        amount_value = float(payload.get("amount") or 0)
    except (TypeError, ValueError):
        amount_value = 0.0

    return {
        "title": str(payload.get("title") or "").strip(),
        "number": str(payload.get("number") or "").strip(),
        "signed_at": str(payload.get("signed_at") or "").strip(),
        "start_date": str(payload.get("start_date") or "").strip(),
        "planned_end_date": str(payload.get("planned_end_date") or "").strip(),
        "amount": amount_value,
        "advance_terms": str(payload.get("advance_terms") or "").strip(),
        "milestones": milestones_out,
    }
