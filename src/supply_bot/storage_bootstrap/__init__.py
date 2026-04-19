from __future__ import annotations

from supply_bot.storage_bootstrap.contracts import ConnectionFactory
from supply_bot.storage_bootstrap.migrations import apply_storage_migrations
from supply_bot.storage_bootstrap.schema import SCHEMA
from supply_bot.storage_bootstrap.seeding_flooring import ensure_estimate_flooring_defaults
from supply_bot.storage_bootstrap.seeding_wall_finish import ensure_estimate_wall_finish_defaults

# Bootstrap-слой persistence: применяет SQL-схему, миграционные добивки и стартовые seed-данные.


async def initialize_storage(connection_factory: ConnectionFactory) -> None:
    # Базовая схема применяется первой, чтобы таблицы и индексы уже существовали для миграций.
    async with connection_factory() as db:
        await db.executescript(SCHEMA)
        await db.commit()

    # После схемы дозаполняем колонки и стартовые справочники.
    await apply_storage_migrations(connection_factory)
    await ensure_estimate_flooring_defaults(connection_factory)
    await ensure_estimate_wall_finish_defaults(connection_factory)


__all__ = ["ConnectionFactory", "initialize_storage"]
