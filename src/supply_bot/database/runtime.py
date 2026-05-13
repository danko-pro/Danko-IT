from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from supply_bot.config import Settings


@dataclass(frozen=True, slots=True)
class DatabaseRuntime:
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    url: str
    backend: str

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        async with self.session_factory() as session:
            yield session

    async def dispose(self) -> None:
        await self.engine.dispose()

    async def create_metadata(self, metadata: MetaData) -> None:
        async with self.engine.begin() as connection:
            await connection.run_sync(metadata.create_all)


def build_database_url(settings: Settings) -> str:
    if settings.database_url:
        return normalize_database_url(settings.database_url)
    return sqlite_database_url(settings.database_path)


def create_database_runtime(settings: Settings, *, echo: bool = False) -> DatabaseRuntime:
    url = build_database_url(settings)
    engine = create_async_engine(url, echo=echo, pool_pre_ping=database_backend_for_url(url) == "postgres")
    return DatabaseRuntime(
        engine=engine,
        session_factory=async_sessionmaker(engine, expire_on_commit=False),
        url=url,
        backend=database_backend_for_url(url),
    )


def normalize_database_url(raw_url: str) -> str:
    url = str(raw_url or "").strip()
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url.removeprefix("postgresql://")
    return url


def sqlite_database_url(database_path: Path) -> str:
    resolved = database_path.expanduser().resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return f"sqlite+aiosqlite:///{resolved.as_posix()}"


def database_backend_for_url(url: str) -> str:
    lowered = url.lower()
    if lowered.startswith(("postgresql+asyncpg://", "postgresql://", "postgres://")):
        return "postgres"
    if lowered.startswith("sqlite+aiosqlite:///"):
        return "sqlite"
    return "unknown"
