from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import time
from pathlib import Path

from supply_bot.utils import parse_bool, parse_csv_ints, parse_time_value

PLACEHOLDER_VALUES = {
    "",
    "your_bot_token_here",
    "your_openai_api_key_here",
    "your_openrouter_api_key_here",
    "your_mistral_api_key_here",
    "your_notion_token_here",
    "your_admin_password_hash_here",
    "your_admin_session_secret_here",
}


@dataclass(frozen=True, slots=True)
class Settings:
    bot_token: str
    debug: bool
    timezone: str
    admin_ids: tuple[int, ...]
    team_group_chat_id: int | None
    quiet_hours_start: time
    quiet_hours_end: time
    default_delivery_start: time
    default_delivery_end: time
    default_delivery_fallback: time
    tasks_source: str
    tasks_file: Path
    tasks_sheet_name: str
    sheets_credentials: Path
    notion_token: str | None
    openai_api_key: str | None
    openrouter_api_key: str | None
    openai_base_url: str
    openrouter_base_url: str
    mistral_api_key: str | None
    mistral_base_url: str
    supply_dialogue_enabled: bool
    supply_dialogue_primary_provider: str
    supply_dialogue_model: str
    supply_dialogue_reasoning_effort: str
    supply_dialogue_max_output_tokens: int
    supply_dialogue_mistral_model: str
    supply_dialogue_mistral_max_output_tokens: int
    supply_dialogue_mistral_timeout_seconds: int
    database_path: Path
    admin_password_hash: str | None
    admin_session_secret: str | None
    admin_session_ttl_seconds: int
    admin_session_cookie_secure: bool
    project_document_max_upload_bytes: int
    project_documents_dir: Path
    config_path: Path

    @property
    def llm_enabled(self) -> bool:
        return self.supply_dialogue_enabled and bool(self.provider_api_key)

    @property
    def provider_api_key(self) -> str | None:
        provider = self.supply_dialogue_primary_provider.lower()
        if provider == "mistral":
            return self.mistral_api_key
        if provider == "openrouter":
            return self.openrouter_api_key
        if provider == "openai":
            return self.openai_api_key
        return None

    @property
    def admin_auth_enabled(self) -> bool:
        return bool(self.admin_password_hash and self.admin_session_secret)


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", maxsplit=1)
        values[key.strip()] = value.strip()
    return values


def _pick_path(base_dir: Path, value: str | None, *, default: str) -> Path:
    candidate = Path(value or default)
    if candidate.is_absolute():
        return candidate
    return (base_dir / candidate).resolve()


def _optional_secret(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    if stripped in PLACEHOLDER_VALUES:
        return None
    return stripped


def discover_config_path(base_dir: Path | None = None) -> Path:
    root = base_dir or Path.cwd()
    override = os.getenv("SUPPLY_BOT_CONFIG")
    if override:
        return Path(override).expanduser().resolve()

    for candidate in (".env.local", ".env", "settings.local.env", "settings.env"):
        path = (root / candidate).resolve()
        if path.exists():
            return path

    raise FileNotFoundError(
        "Не найден файл конфигурации. "
        "Укажите SUPPLY_BOT_CONFIG или создайте .env.local, .env, settings.local.env или settings.env."
    )


def load_settings(config_path: Path | None = None) -> Settings:
    path = (config_path or discover_config_path()).resolve()
    env = _read_env_file(path)
    base_dir = path.parent

    bot_token = env.get("BOT_TOKEN", "").strip()
    if not bot_token or bot_token in PLACEHOLDER_VALUES:
        raise ValueError("BOT_TOKEN не задан в конфиге.")

    return Settings(
        bot_token=bot_token,
        debug=parse_bool(env.get("DEBUG")),
        timezone=env.get("TIMEZONE", "Europe/Berlin"),
        admin_ids=parse_csv_ints(env.get("ADMIN_IDS")),
        team_group_chat_id=int(env["TEAM_GROUP_CHAT_ID"]) if env.get("TEAM_GROUP_CHAT_ID") else None,
        quiet_hours_start=parse_time_value(env.get("QUIET_HOURS_START"), default=time(22, 0)),
        quiet_hours_end=parse_time_value(env.get("QUIET_HOURS_END"), default=time(8, 0)),
        default_delivery_start=parse_time_value(env.get("DEFAULT_DELIVERY_START"), default=time(8, 0)),
        default_delivery_end=parse_time_value(env.get("DEFAULT_DELIVERY_END"), default=time(18, 0)),
        default_delivery_fallback=parse_time_value(env.get("DEFAULT_DELIVERY_FALLBACK"), default=time(16, 0)),
        tasks_source=env.get("TASKS_SOURCE", "local"),
        tasks_file=_pick_path(base_dir, env.get("TASKS_FILE"), default="./data/tasks/tasks.xlsx"),
        tasks_sheet_name=env.get("TASKS_SHEET_NAME", "Tasks"),
        sheets_credentials=_pick_path(base_dir, env.get("SHEETS_CREDENTIALS"), default="./a_settings/credentials.json"),
        notion_token=_optional_secret(env.get("NOTION_TOKEN")),
        openai_api_key=_optional_secret(env.get("OPENAI_API_KEY")),
        openrouter_api_key=_optional_secret(env.get("OPENROUTER_API_KEY")),
        openai_base_url=env.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        openrouter_base_url=env.get(
            "OPENROUTER_BASE_URL",
            env.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        ),
        mistral_api_key=_optional_secret(env.get("MISTRAL_API_KEY")),
        mistral_base_url=env.get("MISTRAL_BASE_URL", "https://api.mistral.ai/v1"),
        supply_dialogue_enabled=parse_bool(env.get("SUPPLY_DIALOGUE_ENABLED")),
        supply_dialogue_primary_provider=env.get("SUPPLY_DIALOGUE_PRIMARY_PROVIDER", "mistral"),
        supply_dialogue_model=env.get("SUPPLY_DIALOGUE_MODEL", "openai/gpt-5-mini"),
        supply_dialogue_reasoning_effort=env.get("SUPPLY_DIALOGUE_REASONING_EFFORT", "low"),
        supply_dialogue_max_output_tokens=int(env.get("SUPPLY_DIALOGUE_MAX_OUTPUT_TOKENS", "320")),
        supply_dialogue_mistral_model=env.get("SUPPLY_DIALOGUE_MISTRAL_MODEL", "mistral-large-latest"),
        supply_dialogue_mistral_max_output_tokens=int(env.get("SUPPLY_DIALOGUE_MISTRAL_MAX_OUTPUT_TOKENS", "320")),
        supply_dialogue_mistral_timeout_seconds=int(env.get("SUPPLY_DIALOGUE_MISTRAL_TIMEOUT_SECONDS", "25")),
        database_path=_pick_path(base_dir, env.get("DATABASE_PATH"), default="./data/supply_bot.sqlite3"),
        admin_password_hash=_optional_secret(env.get("ADMIN_PASSWORD_HASH")),
        admin_session_secret=_optional_secret(env.get("ADMIN_SESSION_SECRET")),
        admin_session_ttl_seconds=int(env.get("ADMIN_SESSION_TTL_SECONDS", "43200")),
        admin_session_cookie_secure=parse_bool(env.get("ADMIN_SESSION_COOKIE_SECURE")),
        project_document_max_upload_bytes=int(env.get("PROJECT_DOCUMENT_MAX_UPLOAD_BYTES", "26214400")),
        project_documents_dir=_pick_path(
            base_dir,
            env.get("PROJECT_DOCUMENTS_DIR"),
            default="./data/project-documents",
        ),
        config_path=path,
    )
