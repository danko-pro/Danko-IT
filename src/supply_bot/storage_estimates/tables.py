from __future__ import annotations

from sqlalchemy import Column, Float, ForeignKey, Index, Integer, Table, Text, text

import supply_bot.storage_auth.tables  # noqa: F401
from supply_bot.database.metadata import metadata

estimate_projects = Table(
    "estimate_projects",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("name", Text, nullable=False),
    Column("residential_complex", Text, nullable=False, server_default=text("''")),
    Column("address", Text, nullable=False, server_default=text("''")),
    Column("entrance_section", Text, nullable=False, server_default=text("''")),
    Column("apartment", Text, nullable=False, server_default=text("''")),
    Column("floor", Text, nullable=False, server_default=text("''")),
    Column("has_elevator", Integer, nullable=False, server_default=text("0")),
    Column("lift_type", Text, nullable=False, server_default=text("''")),
    Column("site_access", Text, nullable=False, server_default=text("''")),
    Column("intercom_code", Text, nullable=False, server_default=text("''")),
    Column("loading_zone", Text, nullable=False, server_default=text("''")),
    Column("responsible_person", Text, nullable=False, server_default=text("''")),
    Column("note", Text, nullable=True),
    Column("group_chat_id", Integer, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_rooms = Table(
    "estimate_rooms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("name", Text, nullable=False),
    Column("ceiling_height_m", Float, nullable=False, server_default=text("2.7")),
    Column("manual_floor_area_m2", Float, nullable=True),
    Column("auto_perimeter_calc", Integer, nullable=False, server_default=text("0")),
    Column("perimeter_factor", Float, nullable=False, server_default=text("1.15")),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_room_walls = Table(
    "estimate_room_walls",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("length_m", Float, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
)

estimate_room_floor_sections = Table(
    "estimate_room_floor_sections",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("length_m", Float, nullable=False),
    Column("width_m", Float, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
)

estimate_room_openings = Table(
    "estimate_room_openings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("opening_type", Text, nullable=False, server_default=text("'window'")),
    Column("width_m", Float, nullable=True),
    Column("height_m", Float, nullable=True),
    Column("quantity", Float, nullable=False, server_default=text("1")),
    Column("area_m2", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
)

estimate_warm_floor_configs = Table(
    "estimate_warm_floor_configs",
    metadata,
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), primary_key=True),
    Column("work_price_per_m2", Float, nullable=False, server_default=text("1600")),
    Column("pipe_m_per_m2", Float, nullable=False, server_default=text("6")),
    Column("max_contour_area_m2", Float, nullable=False, server_default=text("15")),
    Column("small_zone_area_m2", Float, nullable=False, server_default=text("5")),
    Column("manifold_work_price", Float, nullable=False, server_default=text("6000")),
    Column("manifold_material_price", Float, nullable=False, server_default=text("20000")),
    Column("pump_work_price", Float, nullable=False, server_default=text("8000")),
    Column("pump_material_price", Float, nullable=False, server_default=text("25000")),
    Column("pipe_price_per_m", Float, nullable=False, server_default=text("170")),
    Column(
        "pipe_material_title",
        Text,
        nullable=False,
        server_default=text("'Труба PEX-a 16x2 для водяного теплого пола'"),
    ),
    Column("manifold_material_items_json", Text, nullable=False, server_default=text("''")),
    Column("pump_material_items_json", Text, nullable=False, server_default=text("''")),
    Column("consumable_material_items_json", Text, nullable=False, server_default=text("''")),
    Column("pump_rooms_threshold", Integer, nullable=False, server_default=text("3")),
    Column("pump_contours_threshold", Integer, nullable=False, server_default=text("4")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_public_warm_floor_configs = Table(
    "estimate_public_warm_floor_configs",
    metadata,
    Column("config_key", Text, primary_key=True, server_default=text("'global'")),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("version", Text, nullable=False, server_default=text("'warm-floor-v1'")),
    Column("water_labor_rate_per_m2", Float, nullable=False, server_default=text("1600")),
    Column("pipe_meters_per_m2", Float, nullable=False, server_default=text("6")),
    Column("max_circuit_area_m2", Float, nullable=False, server_default=text("15")),
    Column("pump_room_threshold", Integer, nullable=False, server_default=text("3")),
    Column("pump_circuit_threshold", Integer, nullable=False, server_default=text("4")),
    Column("pipe_price_per_meter", Float, nullable=False, server_default=text("168.78")),
    Column("chase_labor_per_meter", Float, nullable=False, server_default=text("900")),
    Column("small_loop_fittings_material", Float, nullable=False, server_default=text("1501.19")),
    Column("small_loop_control_head_material", Float, nullable=False, server_default=text("7000")),
    Column("small_loop_connection_labor", Float, nullable=False, server_default=text("4600")),
    Column("manifold_labor", Float, nullable=False, server_default=text("6000")),
    Column("manifold_material", Float, nullable=False, server_default=text("20000")),
    Column("pump_labor", Float, nullable=False, server_default=text("8000")),
    Column("pump_material", Float, nullable=False, server_default=text("25000")),
    Column("electric_mat_price_per_m2", Float, nullable=False, server_default=text("2700")),
    Column("electric_breaker_material", Float, nullable=False, server_default=text("1500")),
    Column("thermostat_material", Float, nullable=False, server_default=text("5500")),
    Column("electric_wire_material", Float, nullable=False, server_default=text("1000")),
    Column("electric_installation_labor", Float, nullable=False, server_default=text("7000")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_warm_floor_rooms = Table(
    "estimate_warm_floor_rooms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("area_m2_override", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_coverings = Table(
    "estimate_flooring_coverings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("material_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("labor_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("base_waste_percent", Float, nullable=False, server_default=text("0")),
    Column("underlay_mode", Text, nullable=False, server_default=text("'none'")),
    Column("underlay_consumption_per_m2", Float, nullable=False, server_default=text("1")),
    Column("glue_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("glue_unit", Text, nullable=False, server_default=text("'кг'")),
    Column("glue_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("primer_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_unit", Text, nullable=False, server_default=text("'л'")),
    Column("primer_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("svp_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("svp_unit", Text, nullable=False, server_default=text("'шт'")),
    Column("svp_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("grout_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("grout_unit", Text, nullable=False, server_default=text("'кг'")),
    Column("grout_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("needs_plinth", Integer, nullable=False, server_default=text("1")),
    Column("instrument_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("custom_consumables_json", Text, nullable=False, server_default=text("''")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_preparations = Table(
    "estimate_flooring_preparations",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("labor_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("material_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_unit", Text, nullable=False, server_default=text("'л'")),
    Column("primer_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_layouts = Table(
    "estimate_flooring_layouts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("labor_multiplier", Float, nullable=False, server_default=text("1")),
    Column("extra_waste_percent", Float, nullable=False, server_default=text("0")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_configs = Table(
    "estimate_flooring_configs",
    metadata,
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "default_preparation_id",
        Integer,
        ForeignKey("estimate_flooring_preparations.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("include_underlay", Integer, nullable=False, server_default=text("1")),
    Column("include_plinth", Integer, nullable=False, server_default=text("1")),
    Column("include_demolition", Integer, nullable=False, server_default=text("0")),
    Column("include_preparation", Integer, nullable=False, server_default=text("1")),
    Column("demolition_price_per_m2", Float, nullable=False, server_default=text("150")),
    Column("underlay_price_per_m2", Float, nullable=False, server_default=text("120")),
    Column("plinth_material_price_per_m", Float, nullable=False, server_default=text("180")),
    Column("plinth_install_price_per_m", Float, nullable=False, server_default=text("250")),
    Column("threshold_profile_count", Integer, nullable=False, server_default=text("0")),
    Column("threshold_profile_price", Float, nullable=False, server_default=text("900")),
    Column("global_items_json", Text, nullable=False, server_default=text("''")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_rooms = Table(
    "estimate_flooring_rooms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("covering_id", Integer, ForeignKey("estimate_flooring_coverings.id", ondelete="SET NULL"), nullable=True),
    Column(
        "preparation_id",
        Integer,
        ForeignKey("estimate_flooring_preparations.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("layout_id", Integer, ForeignKey("estimate_flooring_layouts.id", ondelete="SET NULL"), nullable=True),
    Column("area_m2_override", Float, nullable=True),
    Column("perimeter_m_override", Float, nullable=True),
    Column("plinth_m_override", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_flooring_room_zones = Table(
    "estimate_flooring_room_zones",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("covering_id", Integer, ForeignKey("estimate_flooring_coverings.id", ondelete="SET NULL"), nullable=True),
    Column(
        "preparation_id",
        Integer,
        ForeignKey("estimate_flooring_preparations.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("layout_id", Integer, ForeignKey("estimate_flooring_layouts.id", ondelete="SET NULL"), nullable=True),
    Column("area_m2", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_coverings = Table(
    "estimate_wall_finish_coverings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("material_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("labor_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("base_waste_percent", Float, nullable=False, server_default=text("0")),
    Column("glue_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("glue_unit", Text, nullable=False, server_default=text("'кг'")),
    Column("glue_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("primer_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_unit", Text, nullable=False, server_default=text("'л'")),
    Column("primer_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("putty_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("putty_unit", Text, nullable=False, server_default=text("'кг'")),
    Column("putty_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("mesh_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("mesh_unit", Text, nullable=False, server_default=text("'м2'")),
    Column("mesh_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("custom_consumables_json", Text, nullable=False, server_default=text("''")),
    Column("instrument_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_preparations = Table(
    "estimate_wall_finish_preparations",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("labor_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("material_price_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_consumption_per_m2", Float, nullable=False, server_default=text("0")),
    Column("primer_unit", Text, nullable=False, server_default=text("'л'")),
    Column("primer_price_per_unit", Float, nullable=False, server_default=text("0")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_layouts = Table(
    "estimate_wall_finish_layouts",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("labor_multiplier", Float, nullable=False, server_default=text("1")),
    Column("extra_waste_percent", Float, nullable=False, server_default=text("0")),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_configs = Table(
    "estimate_wall_finish_configs",
    metadata,
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), primary_key=True),
    Column("include_preparation", Integer, nullable=False, server_default=text("1")),
    Column("include_demolition", Integer, nullable=False, server_default=text("0")),
    Column("demolition_price_per_m2", Float, nullable=False, server_default=text("140")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_rooms = Table(
    "estimate_wall_finish_rooms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("covering_id", Integer, ForeignKey("estimate_wall_finish_coverings.id", ondelete="SET NULL"), nullable=True),
    Column(
        "preparation_id",
        Integer,
        ForeignKey("estimate_wall_finish_preparations.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("layout_id", Integer, ForeignKey("estimate_wall_finish_layouts.id", ondelete="SET NULL"), nullable=True),
    Column("area_m2_override", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_wall_finish_room_zones = Table(
    "estimate_wall_finish_room_zones",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("covering_id", Integer, ForeignKey("estimate_wall_finish_coverings.id", ondelete="SET NULL"), nullable=True),
    Column(
        "preparation_id",
        Integer,
        ForeignKey("estimate_wall_finish_preparations.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("layout_id", Integer, ForeignKey("estimate_wall_finish_layouts.id", ondelete="SET NULL"), nullable=True),
    Column("area_m2", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_door_catalog = Table(
    "estimate_door_catalog",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("title", Text, nullable=False),
    Column("width_mm", Float, nullable=False),
    Column("height_mm", Float, nullable=False),
    Column("thickness_mm", Float, nullable=True),
    Column("area_m2", Float, nullable=True),
    Column("purchase_price", Float, nullable=True),
    Column("sale_price", Float, nullable=True),
    Column("install_price", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_project_doors = Table(
    "estimate_project_doors",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("door_catalog_id", Integer, ForeignKey("estimate_door_catalog.id", ondelete="SET NULL"), nullable=True),
    Column("title", Text, nullable=True),
    Column("opening_kind", Text, nullable=False, server_default=text("'door'")),
    Column("width_mm", Float, nullable=True),
    Column("height_mm", Float, nullable=True),
    Column("thickness_mm", Float, nullable=True),
    Column("area_m2", Float, nullable=True),
    Column("purchase_price", Float, nullable=True),
    Column("sale_price", Float, nullable=True),
    Column("install_price", Float, nullable=True),
    Column("room_a_id", Integer, ForeignKey("estimate_rooms.id", ondelete="SET NULL"), nullable=True),
    Column("room_b_id", Integer, ForeignKey("estimate_rooms.id", ondelete="SET NULL"), nullable=True),
    Column("note", Text, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_door_component_catalog = Table(
    "estimate_door_component_catalog",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("category_code", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("unit", Text, nullable=False, server_default=text("'шт'")),
    Column("purchase_price", Float, nullable=True),
    Column("sale_price", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_project_door_components = Table(
    "estimate_project_door_components",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column(
        "project_door_id",
        Integer,
        ForeignKey("estimate_project_doors.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column(
        "component_catalog_id",
        Integer,
        ForeignKey("estimate_door_component_catalog.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("category_code", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("unit", Text, nullable=False, server_default=text("'шт'")),
    Column("quantity", Float, nullable=False, server_default=text("1")),
    Column("purchase_price", Float, nullable=True),
    Column("sale_price", Float, nullable=True),
    Column("note", Text, nullable=True),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_ceiling_configs = Table(
    "estimate_ceiling_configs",
    metadata,
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), primary_key=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("default_package_code", Text),
    Column("price_factor", Float, nullable=False, server_default=text("1")),
    Column("note", Text),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_ceiling_catalog_items = Table(
    "estimate_ceiling_catalog_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("source_code", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("category", Text, nullable=False),
    Column("unit", Text, nullable=False),
    Column("work_price", Float, nullable=False, server_default=text("0")),
    Column("material_price", Float, nullable=False, server_default=text("0")),
    Column("equipment_price", Float, nullable=False, server_default=text("0")),
    Column("consumables_price", Float, nullable=False, server_default=text("0")),
    Column("price_factor", Float, nullable=False, server_default=text("1")),
    Column("quantity_source", Text),
    Column("quantity_formula", Text),
    Column("include_section", Text, nullable=False, server_default=text("'ceilings'")),
    Column("package_code", Text),
    Column("note", Text),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_ceiling_rooms = Table(
    "estimate_ceiling_rooms",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="CASCADE"), nullable=False),
    Column("default_catalog_item_id", Integer, ForeignKey("estimate_ceiling_catalog_items.id", ondelete="SET NULL")),
    Column("is_enabled", Integer, nullable=False, server_default=text("1")),
    Column("ceiling_area_m2", Float),
    Column("area_source", Text, nullable=False, server_default=text("'room_area'")),
    Column("perimeter_m", Float),
    Column("perimeter_source", Text, nullable=False, server_default=text("'room_perimeter'")),
    Column("package_code_snapshot", Text),
    Column("note", Text),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_project_ceiling_items = Table(
    "estimate_project_ceiling_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("project_id", Integer, ForeignKey("estimate_projects.id", ondelete="CASCADE"), nullable=False),
    Column("room_id", Integer, ForeignKey("estimate_rooms.id", ondelete="SET NULL")),
    Column("source_catalog_item_id", Integer, ForeignKey("estimate_ceiling_catalog_items.id", ondelete="SET NULL")),
    Column("source_code_snapshot", Text),
    Column("title_snapshot", Text, nullable=False),
    Column("category_snapshot", Text),
    Column("unit_snapshot", Text, nullable=False),
    Column("quantity", Float, nullable=False, server_default=text("0")),
    Column("quantity_source", Text, nullable=False, server_default=text("'manual'")),
    Column("quantity_formula_snapshot", Text),
    Column("work_price_snapshot", Float, nullable=False, server_default=text("0")),
    Column("material_price_snapshot", Float, nullable=False, server_default=text("0")),
    Column("equipment_price_snapshot", Float, nullable=False, server_default=text("0")),
    Column("consumables_price_snapshot", Float, nullable=False, server_default=text("0")),
    Column("price_factor_snapshot", Float, nullable=False, server_default=text("1")),
    Column("work_total", Float, nullable=False, server_default=text("0")),
    Column("material_total", Float, nullable=False, server_default=text("0")),
    Column("equipment_total", Float, nullable=False, server_default=text("0")),
    Column("consumables_total", Float, nullable=False, server_default=text("0")),
    Column("total", Float, nullable=False, server_default=text("0")),
    Column("note_snapshot", Text),
    Column("is_enabled", Integer, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

# --- Сантехника (Трек A, этап A1) ---
# Аддитивная схема каталога сантехники по образцу ceilings: owner-scoping
# (owner_user_id NULL = глобальный дефолт), soft-delete (is_active), partial-unique
# индексы global/owner. Зона не хранит свою цену — агрегирует атомы; risk_percent
# остаётся internal и запекается в публичный снапшот (см. plan §1.1, Q3).

estimate_plumbing_catalog_items = Table(
    "estimate_plumbing_catalog_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("source_code", Text, nullable=False),
    Column("public_title", Text, nullable=False),
    Column("technical_title", Text),
    Column("category", Text, nullable=False),
    Column("unit", Text, nullable=False),
    Column("work_price", Float, nullable=False, server_default=text("0")),
    Column("material_price", Float, nullable=False, server_default=text("0")),
    Column("equipment_price", Float, nullable=False, server_default=text("0")),
    Column("consumables_price", Float, nullable=False, server_default=text("0")),
    Column("coefficient", Float, nullable=False, server_default=text("1")),
    Column("catalog_group", Text),
    Column("source", Text),
    Column("note", Text),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_plumbing_zones = Table(
    "estimate_plumbing_zones",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("zone_code", Text, nullable=False),
    Column("subgroup", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("description", Text),
    Column("disclaimer", Text),
    Column("risk_percent", Float, nullable=False, server_default=text("6.4")),
    Column("active_package_code", Text),
    Column("is_active", Integer, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_plumbing_zone_items = Table(
    "estimate_plumbing_zone_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("zone_id", Integer, ForeignKey("estimate_plumbing_zones.id", ondelete="CASCADE"), nullable=False),
    Column(
        "atomic_item_id",
        Integer,
        ForeignKey("estimate_plumbing_catalog_items.id", ondelete="SET NULL"),
    ),
    Column("atomic_source_code", Text, nullable=False),
    Column("quantity", Float, nullable=False, server_default=text("0")),
    Column("coefficient", Float, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_plumbing_zone_packages = Table(
    "estimate_plumbing_zone_packages",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("zone_id", Integer, ForeignKey("estimate_plumbing_zones.id", ondelete="CASCADE"), nullable=False),
    Column("package_code", Text, nullable=False),
    Column("label", Text),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_plumbing_zone_package_items = Table(
    "estimate_plumbing_zone_package_items",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column(
        "package_id",
        Integer,
        ForeignKey("estimate_plumbing_zone_packages.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("zone_id", Integer, ForeignKey("estimate_plumbing_zones.id", ondelete="CASCADE"), nullable=False),
    Column(
        "atomic_item_id",
        Integer,
        ForeignKey("estimate_plumbing_catalog_items.id", ondelete="SET NULL"),
    ),
    Column("atomic_source_code", Text, nullable=False),
    Column("quantity", Float, nullable=False, server_default=text("0")),
    Column("coefficient", Float, nullable=False, server_default=text("1")),
    Column("sort_order", Integer, nullable=False, server_default=text("100")),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

estimate_plumbing_catalog_audit = Table(
    "estimate_plumbing_catalog_audit",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("owner_user_id", Integer, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=True),
    Column("entity_type", Text, nullable=False),
    Column("entity_id", Integer),
    Column("action", Text, nullable=False),
    Column("changed_by_user_id", Integer, ForeignKey("app_users.id", ondelete="SET NULL")),
    Column("diff_json", Text),
    Column("created_at", Text, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)

Index(
    "ix_estimate_projects_owner_updated",
    estimate_projects.c.owner_user_id,
    estimate_projects.c.updated_at,
    estimate_projects.c.id,
)
Index("ix_estimate_projects_owner_group_chat", estimate_projects.c.owner_user_id, estimate_projects.c.group_chat_id)
Index(
    "ix_estimate_rooms_owner_project",
    estimate_rooms.c.owner_user_id,
    estimate_rooms.c.project_id,
    estimate_rooms.c.sort_order,
)
Index("ix_estimate_room_walls_owner_room", estimate_room_walls.c.owner_user_id, estimate_room_walls.c.room_id)
Index(
    "ix_estimate_room_floor_sections_owner_room",
    estimate_room_floor_sections.c.owner_user_id,
    estimate_room_floor_sections.c.room_id,
)
Index(
    "ix_estimate_room_openings_owner_room",
    estimate_room_openings.c.owner_user_id,
    estimate_room_openings.c.room_id,
)
Index(
    "ix_estimate_warm_floor_rooms_owner_project",
    estimate_warm_floor_rooms.c.owner_user_id,
    estimate_warm_floor_rooms.c.project_id,
)
Index(
    "uq_estimate_warm_floor_rooms_global_project_room",
    estimate_warm_floor_rooms.c.project_id,
    estimate_warm_floor_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_warm_floor_rooms.c.owner_user_id.is_(None),
    postgresql_where=estimate_warm_floor_rooms.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_warm_floor_rooms_owner_project_room",
    estimate_warm_floor_rooms.c.owner_user_id,
    estimate_warm_floor_rooms.c.project_id,
    estimate_warm_floor_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_warm_floor_rooms.c.owner_user_id.is_not(None),
    postgresql_where=estimate_warm_floor_rooms.c.owner_user_id.is_not(None),
)
Index("ix_estimate_public_warm_floor_configs_owner", estimate_public_warm_floor_configs.c.owner_user_id)
Index(
    "uq_estimate_flooring_coverings_global_title",
    estimate_flooring_coverings.c.title,
    unique=True,
    sqlite_where=estimate_flooring_coverings.c.owner_user_id.is_(None),
    postgresql_where=estimate_flooring_coverings.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_flooring_coverings_owner_title",
    estimate_flooring_coverings.c.owner_user_id,
    estimate_flooring_coverings.c.title,
    unique=True,
    sqlite_where=estimate_flooring_coverings.c.owner_user_id.is_not(None),
    postgresql_where=estimate_flooring_coverings.c.owner_user_id.is_not(None),
)
Index(
    "uq_estimate_flooring_preparations_global_title",
    estimate_flooring_preparations.c.title,
    unique=True,
    sqlite_where=estimate_flooring_preparations.c.owner_user_id.is_(None),
    postgresql_where=estimate_flooring_preparations.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_flooring_preparations_owner_title",
    estimate_flooring_preparations.c.owner_user_id,
    estimate_flooring_preparations.c.title,
    unique=True,
    sqlite_where=estimate_flooring_preparations.c.owner_user_id.is_not(None),
    postgresql_where=estimate_flooring_preparations.c.owner_user_id.is_not(None),
)
Index(
    "uq_estimate_flooring_layouts_global_title",
    estimate_flooring_layouts.c.title,
    unique=True,
    sqlite_where=estimate_flooring_layouts.c.owner_user_id.is_(None),
    postgresql_where=estimate_flooring_layouts.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_flooring_layouts_owner_title",
    estimate_flooring_layouts.c.owner_user_id,
    estimate_flooring_layouts.c.title,
    unique=True,
    sqlite_where=estimate_flooring_layouts.c.owner_user_id.is_not(None),
    postgresql_where=estimate_flooring_layouts.c.owner_user_id.is_not(None),
)
Index(
    "ix_estimate_flooring_rooms_owner_project",
    estimate_flooring_rooms.c.owner_user_id,
    estimate_flooring_rooms.c.project_id,
)
Index(
    "uq_estimate_flooring_rooms_global_project_room",
    estimate_flooring_rooms.c.project_id,
    estimate_flooring_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_flooring_rooms.c.owner_user_id.is_(None),
    postgresql_where=estimate_flooring_rooms.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_flooring_rooms_owner_project_room",
    estimate_flooring_rooms.c.owner_user_id,
    estimate_flooring_rooms.c.project_id,
    estimate_flooring_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_flooring_rooms.c.owner_user_id.is_not(None),
    postgresql_where=estimate_flooring_rooms.c.owner_user_id.is_not(None),
)
Index(
    "ix_estimate_flooring_room_zones_owner_project_room",
    estimate_flooring_room_zones.c.owner_user_id,
    estimate_flooring_room_zones.c.project_id,
    estimate_flooring_room_zones.c.room_id,
)
Index(
    "uq_estimate_wall_finish_coverings_global_title",
    estimate_wall_finish_coverings.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_coverings.c.owner_user_id.is_(None),
    postgresql_where=estimate_wall_finish_coverings.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_wall_finish_coverings_owner_title",
    estimate_wall_finish_coverings.c.owner_user_id,
    estimate_wall_finish_coverings.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_coverings.c.owner_user_id.is_not(None),
    postgresql_where=estimate_wall_finish_coverings.c.owner_user_id.is_not(None),
)
Index(
    "uq_estimate_wall_finish_preparations_global_title",
    estimate_wall_finish_preparations.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_preparations.c.owner_user_id.is_(None),
    postgresql_where=estimate_wall_finish_preparations.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_wall_finish_preparations_owner_title",
    estimate_wall_finish_preparations.c.owner_user_id,
    estimate_wall_finish_preparations.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_preparations.c.owner_user_id.is_not(None),
    postgresql_where=estimate_wall_finish_preparations.c.owner_user_id.is_not(None),
)
Index(
    "uq_estimate_wall_finish_layouts_global_title",
    estimate_wall_finish_layouts.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_layouts.c.owner_user_id.is_(None),
    postgresql_where=estimate_wall_finish_layouts.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_wall_finish_layouts_owner_title",
    estimate_wall_finish_layouts.c.owner_user_id,
    estimate_wall_finish_layouts.c.title,
    unique=True,
    sqlite_where=estimate_wall_finish_layouts.c.owner_user_id.is_not(None),
    postgresql_where=estimate_wall_finish_layouts.c.owner_user_id.is_not(None),
)
Index(
    "ix_estimate_wall_finish_rooms_owner_project",
    estimate_wall_finish_rooms.c.owner_user_id,
    estimate_wall_finish_rooms.c.project_id,
)
Index(
    "uq_estimate_wall_finish_rooms_global_project_room",
    estimate_wall_finish_rooms.c.project_id,
    estimate_wall_finish_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_wall_finish_rooms.c.owner_user_id.is_(None),
    postgresql_where=estimate_wall_finish_rooms.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_wall_finish_rooms_owner_project_room",
    estimate_wall_finish_rooms.c.owner_user_id,
    estimate_wall_finish_rooms.c.project_id,
    estimate_wall_finish_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_wall_finish_rooms.c.owner_user_id.is_not(None),
    postgresql_where=estimate_wall_finish_rooms.c.owner_user_id.is_not(None),
)
Index(
    "ix_estimate_wall_finish_room_zones_owner_project_room",
    estimate_wall_finish_room_zones.c.owner_user_id,
    estimate_wall_finish_room_zones.c.project_id,
    estimate_wall_finish_room_zones.c.room_id,
)
Index(
    "ix_estimate_door_catalog_owner_active",
    estimate_door_catalog.c.owner_user_id,
    estimate_door_catalog.c.is_active,
)
Index(
    "ix_estimate_door_component_catalog_owner_category",
    estimate_door_component_catalog.c.owner_user_id,
    estimate_door_component_catalog.c.category_code,
)
Index(
    "ix_estimate_project_doors_owner_project",
    estimate_project_doors.c.owner_user_id,
    estimate_project_doors.c.project_id,
)
Index(
    "ix_estimate_project_door_components_owner_project_door",
    estimate_project_door_components.c.owner_user_id,
    estimate_project_door_components.c.project_door_id,
)

Index("ix_estimate_ceiling_configs_owner", estimate_ceiling_configs.c.owner_user_id)
Index("ix_estimate_ceiling_configs_project", estimate_ceiling_configs.c.project_id)
Index(
    "ix_estimate_ceiling_configs_owner_project",
    estimate_ceiling_configs.c.owner_user_id,
    estimate_ceiling_configs.c.project_id,
)
Index("ix_estimate_ceiling_catalog_items_owner", estimate_ceiling_catalog_items.c.owner_user_id)
Index("ix_estimate_ceiling_catalog_items_source_code", estimate_ceiling_catalog_items.c.source_code)
Index(
    "ix_estimate_ceiling_catalog_items_owner_active",
    estimate_ceiling_catalog_items.c.owner_user_id,
    estimate_ceiling_catalog_items.c.is_active,
)
Index(
    "uq_estimate_ceiling_catalog_items_global_source_code",
    estimate_ceiling_catalog_items.c.source_code,
    unique=True,
    sqlite_where=estimate_ceiling_catalog_items.c.owner_user_id.is_(None),
    postgresql_where=estimate_ceiling_catalog_items.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_ceiling_catalog_items_owner_source_code",
    estimate_ceiling_catalog_items.c.owner_user_id,
    estimate_ceiling_catalog_items.c.source_code,
    unique=True,
    sqlite_where=estimate_ceiling_catalog_items.c.owner_user_id.is_not(None),
    postgresql_where=estimate_ceiling_catalog_items.c.owner_user_id.is_not(None),
)
Index("ix_estimate_ceiling_rooms_owner", estimate_ceiling_rooms.c.owner_user_id)
Index("ix_estimate_ceiling_rooms_project", estimate_ceiling_rooms.c.project_id)
Index("ix_estimate_ceiling_rooms_room", estimate_ceiling_rooms.c.room_id)
Index(
    "ix_estimate_ceiling_rooms_owner_project",
    estimate_ceiling_rooms.c.owner_user_id,
    estimate_ceiling_rooms.c.project_id,
)
Index(
    "ix_estimate_ceiling_rooms_owner_project_room",
    estimate_ceiling_rooms.c.owner_user_id,
    estimate_ceiling_rooms.c.project_id,
    estimate_ceiling_rooms.c.room_id,
)
Index(
    "uq_estimate_ceiling_rooms_global_project_room",
    estimate_ceiling_rooms.c.project_id,
    estimate_ceiling_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_ceiling_rooms.c.owner_user_id.is_(None),
    postgresql_where=estimate_ceiling_rooms.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_ceiling_rooms_owner_project_room",
    estimate_ceiling_rooms.c.owner_user_id,
    estimate_ceiling_rooms.c.project_id,
    estimate_ceiling_rooms.c.room_id,
    unique=True,
    sqlite_where=estimate_ceiling_rooms.c.owner_user_id.is_not(None),
    postgresql_where=estimate_ceiling_rooms.c.owner_user_id.is_not(None),
)
Index("ix_estimate_project_ceiling_items_owner", estimate_project_ceiling_items.c.owner_user_id)
Index("ix_estimate_project_ceiling_items_project", estimate_project_ceiling_items.c.project_id)
Index("ix_estimate_project_ceiling_items_room", estimate_project_ceiling_items.c.room_id)
Index(
    "ix_estimate_project_ceiling_items_source_catalog",
    estimate_project_ceiling_items.c.source_catalog_item_id,
)
Index(
    "ix_estimate_project_ceiling_items_owner_project",
    estimate_project_ceiling_items.c.owner_user_id,
    estimate_project_ceiling_items.c.project_id,
)
Index(
    "ix_estimate_project_ceiling_items_owner_project_room",
    estimate_project_ceiling_items.c.owner_user_id,
    estimate_project_ceiling_items.c.project_id,
    estimate_project_ceiling_items.c.room_id,
)

# --- Индексы сантехники (Трек A, этап A1) ---
Index("ix_estimate_plumbing_catalog_items_owner", estimate_plumbing_catalog_items.c.owner_user_id)
Index("ix_estimate_plumbing_catalog_items_source_code", estimate_plumbing_catalog_items.c.source_code)
Index(
    "ix_estimate_plumbing_catalog_items_owner_active",
    estimate_plumbing_catalog_items.c.owner_user_id,
    estimate_plumbing_catalog_items.c.is_active,
)
Index(
    "uq_estimate_plumbing_catalog_items_global_source_code",
    estimate_plumbing_catalog_items.c.source_code,
    unique=True,
    sqlite_where=estimate_plumbing_catalog_items.c.owner_user_id.is_(None),
    postgresql_where=estimate_plumbing_catalog_items.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_plumbing_catalog_items_owner_source_code",
    estimate_plumbing_catalog_items.c.owner_user_id,
    estimate_plumbing_catalog_items.c.source_code,
    unique=True,
    sqlite_where=estimate_plumbing_catalog_items.c.owner_user_id.is_not(None),
    postgresql_where=estimate_plumbing_catalog_items.c.owner_user_id.is_not(None),
)
Index("ix_estimate_plumbing_zones_owner", estimate_plumbing_zones.c.owner_user_id)
Index("ix_estimate_plumbing_zones_zone_code", estimate_plumbing_zones.c.zone_code)
Index(
    "ix_estimate_plumbing_zones_owner_active",
    estimate_plumbing_zones.c.owner_user_id,
    estimate_plumbing_zones.c.is_active,
)
Index(
    "uq_estimate_plumbing_zones_global_zone_code",
    estimate_plumbing_zones.c.zone_code,
    unique=True,
    sqlite_where=estimate_plumbing_zones.c.owner_user_id.is_(None),
    postgresql_where=estimate_plumbing_zones.c.owner_user_id.is_(None),
)
Index(
    "uq_estimate_plumbing_zones_owner_zone_code",
    estimate_plumbing_zones.c.owner_user_id,
    estimate_plumbing_zones.c.zone_code,
    unique=True,
    sqlite_where=estimate_plumbing_zones.c.owner_user_id.is_not(None),
    postgresql_where=estimate_plumbing_zones.c.owner_user_id.is_not(None),
)
Index("ix_estimate_plumbing_zone_items_owner", estimate_plumbing_zone_items.c.owner_user_id)
Index("ix_estimate_plumbing_zone_items_zone", estimate_plumbing_zone_items.c.zone_id)
Index("ix_estimate_plumbing_zone_items_atomic", estimate_plumbing_zone_items.c.atomic_item_id)
Index(
    "ix_estimate_plumbing_zone_items_atomic_source_code",
    estimate_plumbing_zone_items.c.atomic_source_code,
)
Index(
    "ix_estimate_plumbing_zone_items_owner_zone",
    estimate_plumbing_zone_items.c.owner_user_id,
    estimate_plumbing_zone_items.c.zone_id,
)
Index("ix_estimate_plumbing_zone_packages_owner", estimate_plumbing_zone_packages.c.owner_user_id)
Index("ix_estimate_plumbing_zone_packages_zone", estimate_plumbing_zone_packages.c.zone_id)
Index(
    "uq_estimate_plumbing_zone_packages_zone_code",
    estimate_plumbing_zone_packages.c.zone_id,
    estimate_plumbing_zone_packages.c.package_code,
    unique=True,
)
Index(
    "ix_estimate_plumbing_zone_package_items_owner",
    estimate_plumbing_zone_package_items.c.owner_user_id,
)
Index(
    "ix_estimate_plumbing_zone_package_items_package",
    estimate_plumbing_zone_package_items.c.package_id,
)
Index(
    "ix_estimate_plumbing_zone_package_items_zone",
    estimate_plumbing_zone_package_items.c.zone_id,
)
Index(
    "ix_estimate_plumbing_zone_package_items_atomic",
    estimate_plumbing_zone_package_items.c.atomic_item_id,
)
Index(
    "ix_estimate_plumbing_zone_package_items_atomic_source_code",
    estimate_plumbing_zone_package_items.c.atomic_source_code,
)
Index(
    "ix_estimate_plumbing_catalog_audit_entity",
    estimate_plumbing_catalog_audit.c.entity_type,
    estimate_plumbing_catalog_audit.c.entity_id,
)
Index(
    "ix_estimate_plumbing_catalog_audit_changed_by",
    estimate_plumbing_catalog_audit.c.changed_by_user_id,
)
Index("ix_estimate_plumbing_catalog_audit_created_at", estimate_plumbing_catalog_audit.c.created_at)

__all__ = [
    "estimate_ceiling_catalog_items",
    "estimate_ceiling_configs",
    "estimate_ceiling_rooms",
    "estimate_door_catalog",
    "estimate_door_component_catalog",
    "estimate_flooring_configs",
    "estimate_flooring_coverings",
    "estimate_flooring_layouts",
    "estimate_flooring_preparations",
    "estimate_flooring_room_zones",
    "estimate_flooring_rooms",
    "estimate_plumbing_catalog_audit",
    "estimate_plumbing_catalog_items",
    "estimate_plumbing_zone_items",
    "estimate_plumbing_zone_package_items",
    "estimate_plumbing_zone_packages",
    "estimate_plumbing_zones",
    "estimate_project_door_components",
    "estimate_project_doors",
    "estimate_project_ceiling_items",
    "estimate_public_warm_floor_configs",
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
]
