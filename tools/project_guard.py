from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATE_DIR = ROOT / ".tmp"
STATE_PATH = STATE_DIR / "project_guard_state.json"
REMINDER_INTERVAL_SECONDS = 4 * 60 * 60

REMINDER_LINES = (
    "PROJECT_RULES.md: сначала архитектурное размещение, потом код.",
    "Перед работой зафиксируйте для себя:",
    "1. Что делаем.",
    "2. Куда это ложится по архитектуре.",
    "3. Нет ли уже похожей логики.",
    "4. Почему решение не ломает слой и не плодит дубли.",
)
CONFIRMATION_TOKEN = "СТРУКТУРА"


def _load_last_reminder_ts() -> float | None:
    if not STATE_PATH.exists():
        return None
    try:
        payload = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    value = payload.get("last_reminder_ts")
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _store_last_reminder_ts(context: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "last_reminder_ts": time.time(),
        "context": context,
    }
    STATE_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _should_remind(force: bool) -> bool:
    if force:
        return True
    last_ts = _load_last_reminder_ts()
    if last_ts is None:
        return True
    return (time.time() - last_ts) >= REMINDER_INTERVAL_SECONDS


def require_project_guard(context: str, *, force: bool = False) -> int:
    if not _should_remind(force):
        return 0

    print()
    print(f"[project-guard] Контекст запуска: {context}")
    for line in REMINDER_LINES:
        print(f"[project-guard] {line}")
    print("[project-guard] Если последовательность не определена, старт нужно остановить.")

    if sys.stdin.isatty():
        try:
            answer = input(
                f"[project-guard] Введите {CONFIRMATION_TOKEN}, если сначала определили архитектурное размещение: "
            ).strip()
        except EOFError:
            answer = None
        if answer is not None and answer.upper() != CONFIRMATION_TOKEN:
            print("[project-guard] Старт остановлен. Сначала структура, потом код.")
            return 1

    _store_last_reminder_ts(context)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Напоминание о PROJECT_RULES.md перед локальным стартом проекта."
    )
    parser.add_argument("context", nargs="?", default="session")
    parser.add_argument("--force", action="store_true", help="Показать напоминание независимо от таймера.")
    args = parser.parse_args()
    return require_project_guard(args.context, force=args.force)


if __name__ == "__main__":
    raise SystemExit(main())
