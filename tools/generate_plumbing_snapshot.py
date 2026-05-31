"""Генератор публичного снапшота каталога сантехники (A7.2).

Собирает ПУБЛИЧНЫЙ whitelist-снапшот на backend через
``BuildPlumbingSnapshotUseCase.build_public()`` поверх ГЛОБАЛЬНОГО каталога
(``owner_user_id = NULL``, Слой 0) — тот же источник правды, что правит админка.
Резерв (6.4 %) уже запечён в итоги, internal-поля (riskPercent, разбивка цен,
coefficient, source, note, technical_title) в payload не уходят.

Запуск (из ``admin-ui`` через ``scripts/generate-snapshot.js`` на prebuild):

    python ../tools/generate_plumbing_snapshot.py --output <path-to>/plumbing.snapshot.json

Источник данных:
  * ``--database PATH`` — существующий SQLite-каталог (продакшен: правки админки
    попадают в публичный снапшот). Глобальные дефолты досеваются идемпотентно.
  * без ``--database`` — свежая временная БД, засеянная глобальными дефолтами
    (детерминированный парити-снапшот для сборки/CI, без внешних зависимостей).

Версия (``--version``) по умолчанию — детерминированный хеш содержимого, поэтому
повторный прогон на тех же данных даёт байт-в-байт тот же файл (идемпотентность).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from supply_bot.database.metadata import metadata  # noqa: E402
from supply_bot.estimates.application.plumbing_snapshot import (  # noqa: E402
    BuildPlumbingSnapshotUseCase,
)
from supply_bot.storage_estimates.plumbing_repository import (  # noqa: E402
    SqlAlchemyPlumbingRepository,
)
from supply_bot.storage_estimates.plumbing_seed import (  # noqa: E402
    ensure_global_plumbing_defaults,
)


def _content_version(payload: dict[str, Any]) -> str:
    """Детерминированная версия = хеш содержимого (без поля version)."""

    body = {key: value for key, value in payload.items() if key != "version"}
    digest = hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    return f"snapshot-{digest[:16]}"


async def _build_public_snapshot(database: Path | None) -> dict[str, Any]:
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    if database is None:
        tmp_dir = tempfile.TemporaryDirectory()
        db_path = Path(tmp_dir.name) / "plumbing-snapshot.sqlite3"
    else:
        tmp_dir = None
        db_path = database
        db_path.parent.mkdir(parents=True, exist_ok=True)

    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path.as_posix()}")
    try:
        async with engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        # Идемпотентно гарантируем глобальные дефолты (owner=NULL); существующие правки сохраняются.
        await ensure_global_plumbing_defaults(session_factory)
        # owner=None по умолчанию → читаем ТОЛЬКО глобальный Слой 0.
        repository = SqlAlchemyPlumbingRepository(session_factory)
        return await BuildPlumbingSnapshotUseCase(repository, version="").build_public()
    finally:
        await engine.dispose()
        if tmp_dir is not None:
            tmp_dir.cleanup()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Генератор публичного снапшота сантехники (A7.2)")
    parser.add_argument(
        "--database",
        type=Path,
        default=None,
        help="Путь к существующему SQLite-каталогу (по умолчанию — свежая засеянная БД).",
    )
    parser.add_argument(
        "--version",
        type=str,
        default=None,
        help="Версия снапшота (по умолчанию — детерминированный хеш содержимого).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Куда записать JSON (по умолчанию — stdout).",
    )
    args = parser.parse_args(argv)

    payload = asyncio.run(_build_public_snapshot(args.database))
    payload["version"] = args.version or _content_version(payload)

    rendered = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output is None:
        sys.stdout.write(rendered)
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
