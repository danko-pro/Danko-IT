PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS material_families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    canonical_name TEXT NOT NULL,
    category TEXT,
    default_unit TEXT NOT NULL,
    dialog_fields_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES material_families(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (family_id, code)
);

CREATE TABLE IF NOT EXISTS material_skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES material_families(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES material_variants(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    brand TEXT,
    supplier TEXT,
    supplier_article TEXT,
    unit TEXT NOT NULL,
    length_mm REAL,
    width_mm REAL,
    thickness_mm REAL,
    area_m2 REAL,
    extra_json TEXT,
    source_description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    family_id INTEGER REFERENCES material_families(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES material_variants(id) ON DELETE CASCADE,
    sku_id INTEGER REFERENCES material_skus(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_material_aliases_normalized ON material_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS unknown_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_term TEXT NOT NULL,
    normalized_term TEXT NOT NULL,
    full_message TEXT NOT NULL,
    chat_id INTEGER NOT NULL,
    message_id INTEGER,
    guessed_family_id INTEGER REFERENCES material_families(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_message_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    message_id INTEGER,
    text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_message_history_chat ON group_message_history(chat_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_group_message_history_chat_user ON group_message_history(chat_id, user_id, id DESC);

CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    raw_description TEXT,
    object_name TEXT,
    address TEXT,
    flat TEXT,
    floor TEXT,
    elevator TEXT,
    delivery_rules TEXT,
    delivery_start TEXT,
    delivery_end TEXT,
    delivery_fallback TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    master_id INTEGER NOT NULL,
    master_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'collecting',
    waiting_for TEXT,
    waiting_item_id INTEGER REFERENCES request_items(id) ON DELETE SET NULL,
    requested_delivery_date TEXT,
    requested_delivery_time TEXT,
    confirmed_delivery_date TEXT,
    confirmed_delivery_time TEXT,
    proposed_delivery_date TEXT,
    proposed_delivery_time TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_request_drafts_active ON request_drafts(chat_id, master_id, status);

CREATE TABLE IF NOT EXISTS request_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL REFERENCES request_drafts(id) ON DELETE CASCADE,
    family_id INTEGER REFERENCES material_families(id) ON DELETE SET NULL,
    variant_id INTEGER REFERENCES material_variants(id) ON DELETE SET NULL,
    sku_id INTEGER REFERENCES material_skus(id) ON DELETE SET NULL,
    raw_name TEXT,
    normalized_name TEXT,
    quantity REAL,
    unit TEXT,
    thickness_mm REAL,
    length_mm REAL,
    width_mm REAL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'collecting',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    note TEXT,
    group_chat_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ceiling_height_m REAL NOT NULL DEFAULT 2.7,
    manual_floor_area_m2 REAL,
    auto_perimeter_calc INTEGER NOT NULL DEFAULT 0,
    perimeter_factor REAL NOT NULL DEFAULT 1.15,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_room_walls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    length_m REAL NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS estimate_room_floor_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    length_m REAL NOT NULL,
    width_m REAL NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS estimate_room_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    opening_type TEXT NOT NULL DEFAULT 'window',
    width_m REAL,
    height_m REAL,
    quantity REAL NOT NULL DEFAULT 1,
    area_m2 REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS estimate_warm_floor_configs (
    project_id INTEGER PRIMARY KEY REFERENCES estimate_projects(id) ON DELETE CASCADE,
    work_price_per_m2 REAL NOT NULL DEFAULT 1600,
    pipe_m_per_m2 REAL NOT NULL DEFAULT 6,
    max_contour_area_m2 REAL NOT NULL DEFAULT 15,
    small_zone_area_m2 REAL NOT NULL DEFAULT 5,
    manifold_work_price REAL NOT NULL DEFAULT 6000,
    manifold_material_price REAL NOT NULL DEFAULT 20000,
    pump_work_price REAL NOT NULL DEFAULT 8000,
    pump_material_price REAL NOT NULL DEFAULT 25000,
    pipe_price_per_m REAL NOT NULL DEFAULT 170,
    pump_rooms_threshold INTEGER NOT NULL DEFAULT 3,
    pump_contours_threshold INTEGER NOT NULL DEFAULT 4,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_warm_floor_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    area_m2_override REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, room_id)
);

CREATE TABLE IF NOT EXISTS estimate_flooring_configs (
    project_id INTEGER PRIMARY KEY REFERENCES estimate_projects(id) ON DELETE CASCADE,
    include_underlay INTEGER NOT NULL DEFAULT 1,
    include_plinth INTEGER NOT NULL DEFAULT 1,
    include_demolition INTEGER NOT NULL DEFAULT 0,
    include_preparation INTEGER NOT NULL DEFAULT 1,
    demolition_price_per_m2 REAL NOT NULL DEFAULT 150,
    underlay_price_per_m2 REAL NOT NULL DEFAULT 120,
    plinth_material_price_per_m REAL NOT NULL DEFAULT 180,
    plinth_install_price_per_m REAL NOT NULL DEFAULT 250,
    threshold_profile_count INTEGER NOT NULL DEFAULT 0,
    threshold_profile_price REAL NOT NULL DEFAULT 900,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_flooring_coverings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    material_price_per_m2 REAL NOT NULL DEFAULT 0,
    labor_price_per_m2 REAL NOT NULL DEFAULT 0,
    base_waste_percent REAL NOT NULL DEFAULT 0,
    underlay_mode TEXT NOT NULL DEFAULT 'none',
    underlay_consumption_per_m2 REAL NOT NULL DEFAULT 1,
    glue_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    glue_unit TEXT NOT NULL DEFAULT 'кг',
    glue_price_per_unit REAL NOT NULL DEFAULT 0,
    primer_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    primer_unit TEXT NOT NULL DEFAULT 'л',
    primer_price_per_unit REAL NOT NULL DEFAULT 0,
    svp_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    svp_unit TEXT NOT NULL DEFAULT 'шт',
    svp_price_per_unit REAL NOT NULL DEFAULT 0,
    grout_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    grout_unit TEXT NOT NULL DEFAULT 'кг',
    grout_price_per_unit REAL NOT NULL DEFAULT 0,
    needs_plinth INTEGER NOT NULL DEFAULT 1,
    instrument_price_per_m2 REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_flooring_preparations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    labor_price_per_m2 REAL NOT NULL DEFAULT 0,
    material_price_per_m2 REAL NOT NULL DEFAULT 0,
    primer_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    primer_unit TEXT NOT NULL DEFAULT 'л',
    primer_price_per_unit REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_flooring_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    labor_multiplier REAL NOT NULL DEFAULT 1,
    extra_waste_percent REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_flooring_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    covering_id INTEGER REFERENCES estimate_flooring_coverings(id) ON DELETE SET NULL,
    preparation_id INTEGER REFERENCES estimate_flooring_preparations(id) ON DELETE SET NULL,
    layout_id INTEGER REFERENCES estimate_flooring_layouts(id) ON DELETE SET NULL,
    area_m2_override REAL,
    perimeter_m_override REAL,
    plinth_m_override REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, room_id)
);

CREATE TABLE IF NOT EXISTS estimate_wall_finish_configs (
    project_id INTEGER PRIMARY KEY REFERENCES estimate_projects(id) ON DELETE CASCADE,
    include_preparation INTEGER NOT NULL DEFAULT 1,
    include_demolition INTEGER NOT NULL DEFAULT 0,
    demolition_price_per_m2 REAL NOT NULL DEFAULT 140,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_wall_finish_coverings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    material_price_per_m2 REAL NOT NULL DEFAULT 0,
    labor_price_per_m2 REAL NOT NULL DEFAULT 0,
    base_waste_percent REAL NOT NULL DEFAULT 0,
    glue_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    glue_unit TEXT NOT NULL DEFAULT 'кг',
    glue_price_per_unit REAL NOT NULL DEFAULT 0,
    primer_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    primer_unit TEXT NOT NULL DEFAULT 'л',
    primer_price_per_unit REAL NOT NULL DEFAULT 0,
    putty_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    putty_unit TEXT NOT NULL DEFAULT 'кг',
    putty_price_per_unit REAL NOT NULL DEFAULT 0,
    mesh_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    mesh_unit TEXT NOT NULL DEFAULT 'м²',
    mesh_price_per_unit REAL NOT NULL DEFAULT 0,
    instrument_price_per_m2 REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_wall_finish_preparations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    labor_price_per_m2 REAL NOT NULL DEFAULT 0,
    material_price_per_m2 REAL NOT NULL DEFAULT 0,
    primer_consumption_per_m2 REAL NOT NULL DEFAULT 0,
    primer_unit TEXT NOT NULL DEFAULT 'л',
    primer_price_per_unit REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_wall_finish_layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL UNIQUE,
    labor_multiplier REAL NOT NULL DEFAULT 1,
    extra_waste_percent REAL NOT NULL DEFAULT 0,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_wall_finish_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    covering_id INTEGER REFERENCES estimate_wall_finish_coverings(id) ON DELETE SET NULL,
    preparation_id INTEGER REFERENCES estimate_wall_finish_preparations(id) ON DELETE SET NULL,
    layout_id INTEGER REFERENCES estimate_wall_finish_layouts(id) ON DELETE SET NULL,
    area_m2_override REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, room_id)
);

CREATE TABLE IF NOT EXISTS estimate_door_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    width_mm REAL NOT NULL,
    height_mm REAL NOT NULL,
    thickness_mm REAL,
    area_m2 REAL,
    purchase_price REAL,
    sale_price REAL,
    install_price REAL,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_project_doors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    door_catalog_id INTEGER REFERENCES estimate_door_catalog(id) ON DELETE SET NULL,
    title TEXT,
    opening_kind TEXT NOT NULL DEFAULT 'door',
    width_mm REAL,
    height_mm REAL,
    thickness_mm REAL,
    area_m2 REAL,
    purchase_price REAL,
    sale_price REAL,
    install_price REAL,
    room_a_id INTEGER REFERENCES estimate_rooms(id) ON DELETE SET NULL,
    room_b_id INTEGER REFERENCES estimate_rooms(id) ON DELETE SET NULL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_door_component_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_code TEXT NOT NULL,
    title TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'шт',
    purchase_price REAL,
    sale_price REAL,
    note TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS estimate_project_door_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_door_id INTEGER NOT NULL REFERENCES estimate_project_doors(id) ON DELETE CASCADE,
    component_catalog_id INTEGER REFERENCES estimate_door_component_catalog(id) ON DELETE SET NULL,
    category_code TEXT NOT NULL,
    title TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'шт',
    quantity REAL NOT NULL DEFAULT 1,
    purchase_price REAL,
    sale_price REAL,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
