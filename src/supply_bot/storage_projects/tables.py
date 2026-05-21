from __future__ import annotations

from sqlalchemy import Column, Float, ForeignKey, Index, Integer, Table, Text, text

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata

projects = Table(
    "projects",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("code", Text, nullable=False),
    Column("name", Text, nullable=False),
    Column("address", Text, nullable=False, server_default=text("''")),
    Column("entrance_section", Text, nullable=False, server_default=text("''")),
    Column("apartment", Text, nullable=False, server_default=text("''")),
    Column("floor", Text, nullable=False, server_default=text("''")),
    Column("room_count", Integer, nullable=False, server_default=text("0")),
    Column("has_elevator", Integer, nullable=False, server_default=text("0")),
    Column("site_access", Text, nullable=False, server_default=text("''")),
    Column("access_hours", Text, nullable=False, server_default=text("''")),
    Column("intercom_code", Text, nullable=False, server_default=text("''")),
    Column("responsible_person", Text, nullable=False, server_default=text("''")),
    Column("comment", Text, nullable=False, server_default=text("''")),
    Column("stage_label", Text, nullable=False, server_default=text("'Р§РµСЂРЅРѕРІРёРє'")),
    Column("stage_tone", Text, nullable=False, server_default=text("'neutral'")),
    Column("estimate_project_id", Integer, nullable=True),
    Column("estimate_source", Text, nullable=False, server_default=text("''")),
    Column("area_m2", Float, nullable=False, server_default=text("0")),
    Column("ceiling_height_m", Float, nullable=False, server_default=text("0")),
    Column("received_total", Float, nullable=False, server_default=text("0")),
    Column("remaining_total", Float, nullable=False, server_default=text("0")),
    Column("deferred_total", Float, nullable=False, server_default=text("0")),
    Column("planned_total", Float, nullable=False, server_default=text("0")),
    Column("actual_total", Float, nullable=False, server_default=text("0")),
    Column("work_per_m2", Float, nullable=False, server_default=text("0")),
    Column("materials_per_m2", Float, nullable=False, server_default=text("0")),
    Column("planned_margin_percent", Float, nullable=False, server_default=text("0")),
    Column("tax_rate_percent", Float, nullable=False, server_default=text("0")),
    Column("tax_base_mode", Text, nullable=False, server_default=text("'received_total'")),
    Column("next_delivery_label", Text, nullable=False, server_default=text("''")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

project_advances = Table(
    "project_advances",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
    Column("title", Text, nullable=False),
    Column("amount", Float, nullable=False, server_default=text("0")),
    Column("date", Text, nullable=False),
    Column("status", Text, nullable=False, server_default=text("'paid'")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

project_ledger_entries = Table(
    "project_ledger_entries",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
    Column("category", Text, nullable=False),
    Column("item", Text, nullable=False),
    Column("owner", Text, nullable=False, server_default=text("''")),
    Column("counterparty", Text, nullable=False, server_default=text("''")),
    Column("counterparty_inn", Text, nullable=True),
    Column("counterparty_legal_name", Text, nullable=True),
    Column("counterparty_manager_name", Text, nullable=True),
    Column("counterparty_email", Text, nullable=True),
    Column("counterparty_phone", Text, nullable=True),
    Column("counterparty_messenger", Text, nullable=True),
    Column("status", Text, nullable=False, server_default=text("'planned'")),
    Column("plan_amount", Float, nullable=False, server_default=text("0")),
    Column("actual_amount", Float, nullable=False, server_default=text("0")),
    Column("control_date", Text, nullable=False, server_default=text("''")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

project_ledger_documents = Table(
    "project_ledger_documents",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
    Column("ledger_entry_id", Integer, ForeignKey("project_ledger_entries.id", ondelete="CASCADE"), nullable=False),
    Column("kind", Text, nullable=False),
    Column("title", Text, nullable=False, server_default=text("''")),
    Column("date", Text, nullable=False, server_default=text("''")),
    Column("amount", Float, nullable=False, server_default=text("0")),
    Column("source_file_name", Text, nullable=False),
    Column("source_mime_type", Text, nullable=False, server_default=text("'application/octet-stream'")),
    Column("source_storage_key", Text, nullable=False),
    Column("extracted_by_ai", Integer, nullable=False, server_default=text("0")),
    Column("verified_by_user", Integer, nullable=False, server_default=text("0")),
    Column("uploaded_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

project_contracts = Table(
    "project_contracts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
    Column("file_name", Text, nullable=False, server_default=text("''")),
    Column("title", Text, nullable=False, server_default=text("''")),
    Column("number", Text, nullable=False, server_default=text("''")),
    Column("signed_at", Text, nullable=False, server_default=text("''")),
    Column("start_date", Text, nullable=False, server_default=text("''")),
    Column("planned_end_date", Text, nullable=False, server_default=text("''")),
    Column("amount", Float, nullable=False, server_default=text("0")),
    Column("advance_terms", Text, nullable=False, server_default=text("''")),
    Column("extraction_status", Text, nullable=False, server_default=text("'review'")),
    Column("source_file_name", Text, nullable=True),
    Column("source_mime_type", Text, nullable=True),
    Column("source_storage_key", Text, nullable=True),
    Column("uploaded_at", Text, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

project_contract_milestones = Table(
    "project_contract_milestones",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("contract_id", Integer, ForeignKey("project_contracts.id", ondelete="CASCADE"), nullable=False),
    Column("kind", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("planned_date", Text, nullable=False),
    Column("amount", Float, nullable=False),
    Column("note", Text, nullable=True),
    Column("status", Text, nullable=False, server_default=text("'upcoming'")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

Index("ix_projects_owner_user_id", projects.c.owner_user_id)
Index("ix_projects_owner_updated", projects.c.owner_user_id, projects.c.updated_at, projects.c.id)
Index("ix_projects_owner_estimate_project_id", projects.c.owner_user_id, projects.c.estimate_project_id)
Index("ix_project_advances_owner_project", project_advances.c.owner_user_id, project_advances.c.project_id)
Index(
    "ix_project_ledger_entries_owner_project",
    project_ledger_entries.c.owner_user_id,
    project_ledger_entries.c.project_id,
    project_ledger_entries.c.sort_order,
    project_ledger_entries.c.id,
)
Index(
    "uq_project_ledger_documents_global_entry_kind",
    project_ledger_documents.c.ledger_entry_id,
    project_ledger_documents.c.kind,
    unique=True,
    sqlite_where=project_ledger_documents.c.owner_user_id.is_(None),
    postgresql_where=project_ledger_documents.c.owner_user_id.is_(None),
)
Index(
    "uq_project_ledger_documents_owner_entry_kind",
    project_ledger_documents.c.owner_user_id,
    project_ledger_documents.c.ledger_entry_id,
    project_ledger_documents.c.kind,
    unique=True,
    sqlite_where=project_ledger_documents.c.owner_user_id.is_not(None),
    postgresql_where=project_ledger_documents.c.owner_user_id.is_not(None),
)
Index(
    "ix_project_ledger_documents_owner_project",
    project_ledger_documents.c.owner_user_id,
    project_ledger_documents.c.project_id,
    project_ledger_documents.c.ledger_entry_id,
    project_ledger_documents.c.kind,
)
Index(
    "uq_project_contracts_global_project",
    project_contracts.c.project_id,
    unique=True,
    sqlite_where=project_contracts.c.owner_user_id.is_(None),
    postgresql_where=project_contracts.c.owner_user_id.is_(None),
)
Index(
    "uq_project_contracts_owner_project",
    project_contracts.c.owner_user_id,
    project_contracts.c.project_id,
    unique=True,
    sqlite_where=project_contracts.c.owner_user_id.is_not(None),
    postgresql_where=project_contracts.c.owner_user_id.is_not(None),
)
Index(
    "ix_project_contract_milestones_owner_contract",
    project_contract_milestones.c.owner_user_id,
    project_contract_milestones.c.contract_id,
    project_contract_milestones.c.sort_order,
    project_contract_milestones.c.id,
)


