"""Единый клиент внешних AI-провайдеров.

Модуль держит все сетевые вызовы к LLM, транскрибации и OCR в одном месте.
Остальные слои передают сюда уже подготовленные данные и не знают деталей HTTP API.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

import httpx

from supply_bot.config import Settings
from supply_bot.services.llm_support import extract_content, extract_json_content, extract_responses_text

AI_REQUEST_RETRY_DELAYS_SECONDS = (1.0, 2.0)

logger = logging.getLogger(__name__)


class LlmProviderClient:
    """Фасад над подключенными AI-провайдерами.

    Клиент отвечает за выбор доступных ключей, порядок fallback-провайдеров,
    сборку payload и разбор типовых ответов.
    """

    def __init__(self, settings: Settings) -> None:
        """Сохраняет конфигурацию, из которой берутся ключи, модели и таймауты."""
        self.settings = settings

    @property
    def enabled(self) -> bool:
        """Показывает, можно ли выполнять AI-вызовы хотя бы через один настроенный провайдер."""
        return self.settings.supply_dialogue_enabled and bool(self.provider_candidates())

    def provider_candidates(self) -> list[str]:
        """Возвращает провайдеров в порядке попыток: сначала primary, затем fallback."""
        primary = self.settings.supply_dialogue_primary_provider.lower()
        providers = [primary]
        for candidate in ("openai", "mistral", "openrouter"):
            if candidate not in providers:
                providers.append(candidate)
        return [provider for provider in providers if self._provider_has_key(provider)]

    async def complete_text(self, messages: list[dict[str, str]], *, provider: str) -> str | None:
        """Запрашивает обычный текстовый ответ у chat-compatible провайдера."""
        payload = await self._post_chat_completion(provider, messages, json_response=False)
        return extract_content(payload)

    async def complete_json(self, messages: list[dict[str, str]], *, provider: str) -> dict[str, Any] | None:
        """Запрашивает JSON-ответ у chat-compatible провайдера."""
        payload = await self._post_chat_completion(provider, messages, json_response=True)
        return extract_json_content(payload)

    async def transcribe_audio_bytes(
        self,
        audio_bytes: bytes,
        *,
        file_name: str,
        mime_type: str | None = None,
    ) -> str | None:
        """Отправляет аудиофайл в OpenAI transcription API и возвращает распознанный текст."""
        if not self.settings.openai_api_key:
            return None

        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        files = {"file": (file_name, audio_bytes, mime_type or "application/octet-stream")}
        data = {
            "model": self.settings.openai_transcription_model,
            "response_format": "json",
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await self._post_with_retries(
                client,
                f"{self.settings.openai_base_url.rstrip('/')}/audio/transcriptions",
                headers=headers,
                data=data,
                files=files,
            )

        text = response.json().get("text")
        return text.strip() if isinstance(text, str) and text.strip() else None

    async def extract_text_from_image_bytes(
        self,
        image_bytes: bytes,
        *,
        mime_type: str,
        prompt: str,
    ) -> str | None:
        """Отправляет изображение документа в OpenAI vision API и возвращает извлеченный текст."""
        if not self.settings.openai_api_key:
            return None

        # Responses API принимает изображение как data URL, поэтому байты кодируются в base64.
        image_data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.settings.openai_vision_model,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": image_data_url},
                    ],
                }
            ],
            "max_output_tokens": self.settings.supply_dialogue_max_output_tokens,
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await self._post_with_retries(
                client,
                f"{self.settings.openai_base_url.rstrip('/')}/responses",
                headers=headers,
                json=payload,
            )
        return extract_responses_text(response.json())

    def _provider_has_key(self, provider: str) -> bool:
        """Проверяет, есть ли ключ для конкретного провайдера."""
        if provider == "openai":
            return bool(self.settings.openai_api_key)
        if provider == "mistral":
            return bool(self.settings.mistral_api_key)
        if provider == "openrouter":
            return bool(self.settings.openrouter_api_key)
        return False

    def _provider_auth_token(self, provider: str) -> str:
        """Возвращает токен авторизации для выбранного провайдера."""
        if provider == "openai":
            return str(self.settings.openai_api_key)
        if provider == "mistral":
            return str(self.settings.mistral_api_key)
        if provider == "openrouter":
            return str(self.settings.openrouter_api_key)
        raise ValueError(f"Unsupported LLM provider: {provider}")

    def _provider_base_url(self, provider: str) -> str:
        """Возвращает базовый URL API для выбранного провайдера."""
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
        """Собирает chat payload с учетом отличий OpenAI, Mistral и OpenRouter."""
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
        """Выполняет общий HTTP-вызов chat completions и возвращает сырой JSON."""
        headers = {
            "Authorization": f"Bearer {self._provider_auth_token(provider)}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.settings.supply_dialogue_mistral_timeout_seconds) as client:
            response = await self._post_with_retries(
                client,
                f"{self._provider_base_url(provider)}/chat/completions",
                headers=headers,
                json=self._chat_payload(provider, messages, json_response=json_response),
            )
        return response.json()

    async def _post_with_retries(
        self,
        client: httpx.AsyncClient,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Повторяет временные сетевые ошибки AI API, чтобы бот не зависел от одного сбоя."""
        for attempt, delay in enumerate((*AI_REQUEST_RETRY_DELAYS_SECONDS, 0.0)):
            try:
                response = await client.post(url, **kwargs)
                response.raise_for_status()
                return response
            except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
                if not self._should_retry_exception(exc) or attempt >= len(AI_REQUEST_RETRY_DELAYS_SECONDS):
                    raise
                logger.warning(
                    "AI-запрос завершился временной ошибкой %s, повтор через %.1f секунд.",
                    type(exc).__name__,
                    delay,
                )
                await asyncio.sleep(delay)
        raise RuntimeError("Цикл повторов AI-запроса завершился без ответа.")

    def _should_retry_exception(self, exc: Exception) -> bool:
        """Отделяет временные сетевые ошибки от постоянных ошибок payload или доступа."""
        if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
            return True
        if isinstance(exc, httpx.HTTPStatusError):
            status_code = exc.response.status_code
            return status_code in {408, 409, 425, 429} or status_code >= 500
        return False
