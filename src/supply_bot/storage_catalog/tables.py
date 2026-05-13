from __future__ import annotations

from sqlalchemy import Boolean, Column, Float, ForeignKey, Index, Integer, Table, Text, UniqueConstraint, text

from supply_bot.database.metadata import metadata
from supply_bot.storage_auth.tables import app_users as app_users  # noqa: F401

material_families = Table(
    "material_families",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("code", Text, nullable=False),
    Column("canonical_name", Text, nullable=False),
    Column("category", Text, nullable=True),
    Column("default_unit", Text, nullable=False),
    Column("dialog_fields_json", Text, nullable=False, server_default=text("'[]'")),
    Column("is_active", Boolean, nullable=False, server_default=text("true")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("owner_user_id", "code", name="uq_material_families_owner_code"),
)

material_variants = Table(
    "material_variants",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("family_id", Integer, ForeignKey("material_families.id", ondelete="CASCADE"), nullable=False),
    Column("code", Text, nullable=False),
    Column("display_name", Text, nullable=False),
    Column("is_active", Boolean, nullable=False, server_default=text("true")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("owner_user_id", "family_id", "code", name="uq_material_variants_owner_family_code"),
)

material_skus = Table(
    "material_skus",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("family_id", Integer, ForeignKey("material_families.id", ondelete="CASCADE"), nullable=False),
    Column("variant_id", Integer, ForeignKey("material_variants.id", ondelete="SET NULL"), nullable=True),
    Column("title", Text, nullable=False),
    Column("brand", Text, nullable=True),
    Column("supplier", Text, nullable=True),
    Column("supplier_article", Text, nullable=True),
    Column("unit", Text, nullable=False),
    Column("length_mm", Float, nullable=True),
    Column("width_mm", Float, nullable=True),
    Column("thickness_mm", Float, nullable=True),
    Column("area_m2", Float, nullable=True),
    Column("extra_json", Text, nullable=True),
    Column("source_description", Text, nullable=True),
    Column("is_active", Boolean, nullable=False, server_default=text("true")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

material_aliases = Table(
    "material_aliases",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("alias", Text, nullable=False),
    Column("normalized_alias", Text, nullable=False),
    Column("family_id", Integer, ForeignKey("material_families.id", ondelete="CASCADE"), nullable=True),
    Column("variant_id", Integer, ForeignKey("material_variants.id", ondelete="CASCADE"), nullable=True),
    Column("sku_id", Integer, ForeignKey("material_skus.id", ondelete="CASCADE"), nullable=True),
    Column("priority", Integer, nullable=False, server_default=text("100")),
    Column("is_active", Boolean, nullable=False, server_default=text("true")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

unknown_terms = Table(
    "unknown_terms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("raw_term", Text, nullable=False),
    Column("normalized_term", Text, nullable=False),
    Column("full_message", Text, nullable=False),
    Column("chat_id", Integer, nullable=False),
    Column("message_id", Integer, nullable=True),
    Column("guessed_family_id", Integer, ForeignKey("material_families.id", ondelete="SET NULL"), nullable=True),
    Column("status", Text, nullable=False, server_default=text("'new'")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

Index("ix_material_families_owner_user_id", material_families.c.owner_user_id)
Index("ix_material_variants_owner_user_id", material_variants.c.owner_user_id)
Index("ix_material_skus_owner_user_id", material_skus.c.owner_user_id)
Index("ix_material_aliases_owner_user_id", material_aliases.c.owner_user_id)
Index("ix_material_aliases_normalized", material_aliases.c.normalized_alias)
Index("ix_unknown_terms_owner_user_id", unknown_terms.c.owner_user_id)
