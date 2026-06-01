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

CREATE TABLE IF NOT EXISTS request_draft_participants (
    draft_id INTEGER NOT NULL REFERENCES request_drafts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    role TEXT NOT NULL DEFAULT 'participant',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (draft_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_request_draft_participants_user
    ON request_draft_participants(user_id, draft_id);

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

CREATE TABLE IF NOT EXISTS telegram_notification_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_outbox_pending
    ON telegram_notification_outbox(status, next_attempt_at, id);

CREATE TABLE IF NOT EXISTS estimate_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    residential_complex TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    entrance_section TEXT NOT NULL DEFAULT '',
    apartment TEXT NOT NULL DEFAULT '',
    floor TEXT NOT NULL DEFAULT '',
    has_elevator INTEGER NOT NULL DEFAULT 0,
    lift_type TEXT NOT NULL DEFAULT '',
    site_access TEXT NOT NULL DEFAULT '',
    intercom_code TEXT NOT NULL DEFAULT '',
    loading_zone TEXT NOT NULL DEFAULT '',
    responsible_person TEXT NOT NULL DEFAULT '',
    note TEXT,
    group_chat_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    stage_label TEXT NOT NULL DEFAULT 'Черновик',
    stage_tone TEXT NOT NULL DEFAULT 'neutral',
    estimate_project_id INTEGER REFERENCES estimate_projects(id) ON DELETE SET NULL,
    estimate_source TEXT NOT NULL DEFAULT '',
    area_m2 REAL NOT NULL DEFAULT 0,
    received_total REAL NOT NULL DEFAULT 0,
    remaining_total REAL NOT NULL DEFAULT 0,
    deferred_total REAL NOT NULL DEFAULT 0,
    planned_total REAL NOT NULL DEFAULT 0,
    actual_total REAL NOT NULL DEFAULT 0,
    work_per_m2 REAL NOT NULL DEFAULT 0,
    materials_per_m2 REAL NOT NULL DEFAULT 0,
    planned_margin_percent REAL NOT NULL DEFAULT 0,
    next_delivery_label TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_projects_estimate_project_id ON projects(estimate_project_id);

CREATE TABLE IF NOT EXISTS project_advances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_advances_project_id ON project_advances(project_id, date DESC, id DESC);

CREATE TABLE IF NOT EXISTS project_ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    item TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    counterparty TEXT NOT NULL DEFAULT '',
    counterparty_inn TEXT,
    counterparty_legal_name TEXT,
    counterparty_manager_name TEXT,
    counterparty_email TEXT,
    counterparty_phone TEXT,
    counterparty_messenger TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    plan_amount REAL NOT NULL DEFAULT 0,
    actual_amount REAL NOT NULL DEFAULT 0,
    control_date TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_ledger_entries_project_id ON project_ledger_entries(project_id, sort_order, id);

CREATE TABLE IF NOT EXISTS project_ledger_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ledger_entry_id INTEGER NOT NULL REFERENCES project_ledger_entries(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL DEFAULT 0,
    source_file_name TEXT NOT NULL,
    source_mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    source_storage_key TEXT NOT NULL,
    extracted_by_ai INTEGER NOT NULL DEFAULT 0,
    verified_by_user INTEGER NOT NULL DEFAULT 0,
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ledger_entry_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_project_ledger_documents_project_id ON project_ledger_documents(project_id, ledger_entry_id, kind);

CREATE TABLE IF NOT EXISTS project_contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '',
    signed_at TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL DEFAULT '',
    planned_end_date TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL DEFAULT 0,
    advance_terms TEXT NOT NULL DEFAULT '',
    extraction_status TEXT NOT NULL DEFAULT 'review',
    source_file_name TEXT,
    source_mime_type TEXT,
    source_storage_key TEXT,
    uploaded_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_contracts_project_id ON project_contracts(project_id);

CREATE TABLE IF NOT EXISTS project_contract_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL REFERENCES project_contracts(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    planned_date TEXT NOT NULL,
    amount REAL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming',
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_contract_milestones_contract_id ON project_contract_milestones(contract_id, sort_order, id);

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
    pipe_material_title TEXT NOT NULL DEFAULT 'Труба PEX-a 16x2 для водяного тёплого пола',
    manifold_material_items_json TEXT NOT NULL DEFAULT '',
    pump_material_items_json TEXT NOT NULL DEFAULT '',
    consumable_material_items_json TEXT NOT NULL DEFAULT '',
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
    default_preparation_id INTEGER REFERENCES estimate_flooring_preparations(id) ON DELETE SET NULL,
    demolition_price_per_m2 REAL NOT NULL DEFAULT 150,
    underlay_price_per_m2 REAL NOT NULL DEFAULT 120,
    plinth_material_price_per_m REAL NOT NULL DEFAULT 180,
    plinth_install_price_per_m REAL NOT NULL DEFAULT 250,
    threshold_profile_count INTEGER NOT NULL DEFAULT 0,
    threshold_profile_price REAL NOT NULL DEFAULT 900,
    global_items_json TEXT NOT NULL DEFAULT '',
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
    labor_price_per_m2 REAL NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS estimate_flooring_room_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    covering_id INTEGER REFERENCES estimate_flooring_coverings(id) ON DELETE SET NULL,
    preparation_id INTEGER REFERENCES estimate_flooring_preparations(id) ON DELETE SET NULL,
    layout_id INTEGER REFERENCES estimate_flooring_layouts(id) ON DELETE SET NULL,
    area_m2 REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    custom_consumables_json TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS estimate_wall_finish_room_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES estimate_projects(id) ON DELETE CASCADE,
    room_id INTEGER NOT NULL REFERENCES estimate_rooms(id) ON DELETE CASCADE,
    covering_id INTEGER REFERENCES estimate_wall_finish_coverings(id) ON DELETE SET NULL,
    preparation_id INTEGER REFERENCES estimate_wall_finish_preparations(id) ON DELETE SET NULL,
    layout_id INTEGER REFERENCES estimate_wall_finish_layouts(id) ON DELETE SET NULL,
    area_m2 REAL,
    note TEXT,
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
