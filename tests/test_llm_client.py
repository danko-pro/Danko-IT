"""Тесты общего AI-клиента и парсеров ответов."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from supply_bot.config import load_settings
from supply_bot.services.llm_client import LlmProviderClient
from supply_bot.services.llm_support import extract_responses_text


def _settings(
    *,
    enabled: bool = True,
    primary_provider: str = "mistral",
    openai_api_key: str | None = None,
    mistral_api_key: str | None = None,
    openrouter_api_key: str | None = None,
) -> SimpleNamespace:
    """Создает минимальный settings-объект без чтения реального env-файла."""
    return SimpleNamespace(
        supply_dialogue_enabled=enabled,
        supply_dialogue_primary_provider=primary_provider,
        openai_api_key=openai_api_key,
        mistral_api_key=mistral_api_key,
        openrouter_api_key=openrouter_api_key,
        openai_base_url="https://api.openai.test/v1",
        mistral_base_url="https://api.mistral.test/v1",
        openrouter_base_url="https://api.openrouter.test/v1",
        supply_dialogue_model="test-model",
        supply_dialogue_reasoning_effort="low",
        supply_dialogue_max_output_tokens=100,
        supply_dialogue_mistral_model="mistral-test",
        supply_dialogue_mistral_max_output_tokens=100,
        supply_dialogue_mistral_timeout_seconds=5,
    )


def test_llm_provider_candidates_prioritize_configured_provider() -> None:
    """Проверяет, что primary provider идет первым, а fallback остается доступным."""
    client = LlmProviderClient(
        _settings(
            primary_provider="openrouter",
            openai_api_key="openai-key",
            openrouter_api_key="openrouter-key",
        )
    )

    assert client.provider_candidates() == ["openrouter", "openai"]


def test_llm_provider_client_disabled_without_keys() -> None:
    """Проверяет отключенное состояние, когда нет ни одного ключа провайдера."""
    client = LlmProviderClient(_settings())

    assert client.provider_candidates() == []
    assert not client.enabled


def test_llm_provider_client_disabled_by_feature_flag() -> None:
    """Проверяет, что feature flag отключает AI даже при наличии ключа."""
    client = LlmProviderClient(_settings(enabled=False, mistral_api_key="mistral-key"))

    assert client.provider_candidates() == ["mistral"]
    assert not client.enabled


def test_settings_llm_enabled_accepts_fallback_provider_key() -> None:
    """Проверяет, что AI включается, если доступен fallback-ключ провайдера."""
    with TemporaryDirectory() as tmp_dir:
        config_path = Path(tmp_dir) / ".env.test"
        config_path.write_text(
            "\n".join(
                [
                    "BOT_TOKEN=test-token",
                    "SUPPLY_DIALOGUE_ENABLED=True",
                    "SUPPLY_DIALOGUE_PRIMARY_PROVIDER=mistral",
                    "OPENAI_API_KEY=openai-key",
                ]
            ),
            encoding="utf-8",
        )

        settings = load_settings(config_path)

        assert settings.llm_enabled
        assert settings.provider_api_key is None


def test_extract_responses_text_reads_output_items() -> None:
    """Проверяет чтение текста из структуры OpenAI Responses API."""
    assert (
        extract_responses_text(
            {
                "output": [
                    {
                        "content": [
                            {"type": "output_text", "text": "visible document text"},
                        ]
                    }
                ]
            }
        )
        == "visible document text"
    )
