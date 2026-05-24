from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import supply_bot.storage_auth.tables  # noqa: E402,F401
import supply_bot.storage_catalog.tables  # noqa: E402,F401
import supply_bot.storage_estimates.tables  # noqa: E402,F401
import supply_bot.storage_notifications.tables  # noqa: E402,F401
import supply_bot.storage_projects.tables  # noqa: E402,F401
import supply_bot.storage_public_leads.tables  # noqa: E402,F401
import supply_bot.storage_requests.tables  # noqa: E402,F401
from supply_bot.config import load_settings  # noqa: E402
from supply_bot.database import build_database_url, metadata  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = metadata
current_dialect_name: str | None = None
SQLITE_ESTIMATE_TABLES = {
    "estimate_door_catalog",
    "estimate_door_component_catalog",
    "estimate_ceiling_catalog_items",
    "estimate_ceiling_configs",
    "estimate_ceiling_rooms",
    "estimate_flooring_configs",
    "estimate_flooring_coverings",
    "estimate_flooring_layouts",
    "estimate_flooring_preparations",
    "estimate_flooring_room_zones",
    "estimate_flooring_rooms",
    "estimate_project_door_components",
    "estimate_project_doors",
    "estimate_project_ceiling_items",
    "estimate_projects",
    "estimate_room_floor_sections",
    "estimate_room_openings",
    "estimate_room_walls",
    "estimate_rooms",
    "estimate_wall_finish_configs",
    "estimate_wall_finish_coverings",
    "estimate_wall_finish_layouts",
    "estimate_wall_finish_preparations",
    "estimate_wall_finish_room_zones",
    "estimate_wall_finish_rooms",
    "estimate_warm_floor_configs",
    "estimate_warm_floor_rooms",
}
SQLITE_RELAXED_TABLES = {
    "app_users",
    *SQLITE_ESTIMATE_TABLES,
    "group_message_history",
    "group_profiles",
    "material_aliases",
    "material_families",
    "material_skus",
    "material_variants",
    "project_advances",
    "project_contract_milestones",
    "project_contracts",
    "project_ledger_documents",
    "project_ledger_entries",
    "projects",
    "public_leads",
    "request_draft_participants",
    "request_drafts",
    "request_items",
    "telegram_notification_outbox",
    "unknown_terms",
}
SQLITE_RELAXED_NULLABLE_TABLES = {
    *SQLITE_ESTIMATE_TABLES,
    "group_profiles",
    "project_advances",
    "project_contract_milestones",
    "project_contracts",
    "project_ledger_documents",
    "project_ledger_entries",
    "projects",
    "request_items",
}
SQLITE_MATERIAL_TABLES = {
    *SQLITE_ESTIMATE_TABLES,
    "group_message_history",
    "group_profiles",
    "material_aliases",
    "material_families",
    "material_skus",
    "material_variants",
    "project_advances",
    "project_contract_milestones",
    "project_contracts",
    "project_ledger_documents",
    "project_ledger_entries",
    "projects",
    "public_leads",
    "request_draft_participants",
    "request_drafts",
    "request_items",
    "telegram_notification_outbox",
    "unknown_terms",
}


def get_database_url() -> str:
    return build_database_url(load_settings())


def run_migrations_offline() -> None:
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def include_object(object_, name, type_, reflected, compare_to) -> bool:
    object_table = getattr(object_, "table", None)
    if (
        current_dialect_name == "sqlite"
        and type_ == "column"
        and name == "id"
        and getattr(object_table, "name", None) in SQLITE_RELAXED_TABLES
    ):
        return False
    if (
        current_dialect_name == "sqlite"
        and type_ == "column"
        and getattr(object_table, "name", None) in SQLITE_RELAXED_NULLABLE_TABLES
    ):
        return False
    if (
        current_dialect_name == "sqlite"
        and type_ in {"foreign_key_constraint", "index", "unique_constraint"}
        and getattr(object_table, "name", None) in SQLITE_MATERIAL_TABLES
    ):
        return False
    if reflected and compare_to is None:
        return False
    return True


def compare_type(context_, inspected_column, metadata_column, inspected_type, metadata_type):
    table_name = getattr(getattr(metadata_column, "table", None), "name", None)
    if current_dialect_name == "sqlite" and table_name in SQLITE_MATERIAL_TABLES:
        return False
    return None


def do_run_migrations(connection) -> None:
    global current_dialect_name
    current_dialect_name = connection.dialect.name
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        compare_type=compare_type,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    config_section = config.get_section(config.config_ini_section, {})
    config_section["sqlalchemy.url"] = get_database_url()
    connectable = async_engine_from_config(
        config_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
