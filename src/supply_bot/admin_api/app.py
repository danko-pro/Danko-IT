from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from supply_bot.admin_api.app_routes_auth import register_auth_routes
from supply_bot.admin_api.app_routes_calculator import register_calculator_routes
from supply_bot.admin_api.app_routes_materials import register_material_routes
from supply_bot.admin_api.app_routes_projects import register_project_routes
from supply_bot.admin_api.app_routes_requests import register_request_routes
from supply_bot.admin_api.app_routes_support import register_support_routes
from supply_bot.config import Settings, load_settings
from supply_bot.storage import BotStorage


class AdminLoginPayload(BaseModel):
    password: str


class FamilyCreatePayload(BaseModel):
    canonical_name: str
    default_unit: str
    dialog_fields: list[str] = Field(default_factory=list)
    category: str | None = None


class VariantCreatePayload(BaseModel):
    family_id: int
    display_name: str


class SkuCreatePayload(BaseModel):
    family_id: int
    variant_id: int | None = None
    title: str
    article: str | None = None
    brand: str | None = None
    unit: str
    thickness_mm: float | None = None
    length_mm: float | None = None
    width_mm: float | None = None
    source_description: str | None = None


class DeliverySettingsPayload(BaseModel):
    delivery_start: str
    delivery_end: str
    delivery_fallback: str


class AliasCreatePayload(BaseModel):
    alias: str
    family_id: int | None = None
    variant_id: int | None = None
    sku_id: int | None = None
    priority: int = 100


class RequestStatusPayload(BaseModel):
    status: str


class RequestActionResult(BaseModel):
    draft_id: int
    status: str
    notified: bool = False
    notification_error: str | None = None


class RequestDeliveryPayload(BaseModel):
    delivery_date: str | None = None
    delivery_time: str | None = None


class RequestItemPayload(BaseModel):
    title: str
    quantity: float | None = None
    unit: str | None = None
    thickness_mm: float | None = None
    length_mm: float | None = None
    width_mm: float | None = None
    note: str | None = None
    detach_catalog: bool = False


class CalculatorProjectCreatePayload(BaseModel):
    name: str
    note: str | None = None
    group_chat_id: int | None = None


class ProjectCreatePayload(BaseModel):
    code: str | None = None
    name: str | None = None
    stage_label: str | None = None
    stage_tone: str | None = None
    estimate_project_id: int | None = None
    estimate_source: str | None = None
    area_m2: float = 0
    received_total: float = 0
    remaining_total: float = 0
    deferred_total: float = 0
    planned_total: float = 0
    actual_total: float = 0
    work_per_m2: float = 0
    materials_per_m2: float = 0
    planned_margin_percent: float = 0
    next_delivery_label: str | None = None


class ProjectUpdatePayload(BaseModel):
    code: str | None = None
    name: str | None = None
    stage_label: str | None = None
    stage_tone: str | None = None
    estimate_project_id: int | None = None
    estimate_source: str | None = None
    area_m2: float | None = None
    received_total: float | None = None
    remaining_total: float | None = None
    deferred_total: float | None = None
    planned_total: float | None = None
    actual_total: float | None = None
    work_per_m2: float | None = None
    materials_per_m2: float | None = None
    planned_margin_percent: float | None = None
    next_delivery_label: str | None = None


class ProjectAdvanceCreatePayload(BaseModel):
    title: str | None = None
    amount: float
    date: str
    status: str = "paid"


class ProjectLedgerCounterpartyPayload(BaseModel):
    inn: str | None = None
    legalName: str | None = None
    managerName: str | None = None
    email: str | None = None
    phone: str | None = None
    messenger: str | None = None


class ProjectLedgerEntryCreatePayload(BaseModel):
    category: str | None = None
    item: str | None = None
    owner: str | None = None
    counterparty: str | None = None
    counterparty_details: ProjectLedgerCounterpartyPayload | None = None
    status: str = "planned"
    plan_amount: float = 0
    actual_amount: float = 0
    control_date: str | None = None


class ProjectLedgerEntryUpdatePayload(BaseModel):
    category: str | None = None
    item: str | None = None
    owner: str | None = None
    counterparty: str | None = None
    counterparty_details: ProjectLedgerCounterpartyPayload | None = None
    status: str | None = None
    plan_amount: float | None = None
    actual_amount: float | None = None
    control_date: str | None = None


class ProjectLedgerDocumentUpdatePayload(BaseModel):
    title: str | None = None
    date: str | None = None
    amount: float | None = None
    extracted_by_ai: bool | None = None
    verified_by_user: bool | None = None


class ProjectContractMilestonePayload(BaseModel):
    kind: str = "deadline"
    title: str
    planned_date: str
    amount: float | None = None
    note: str | None = None
    status: str = "upcoming"
    sort_order: int | None = None


class ProjectContractUpdatePayload(BaseModel):
    file_name: str | None = None
    title: str | None = None
    number: str | None = None
    signed_at: str | None = None
    start_date: str | None = None
    planned_end_date: str | None = None
    amount: float = 0
    advance_terms: str | None = None
    extraction_status: str = "review"
    milestones: list[ProjectContractMilestonePayload] = Field(default_factory=list)


class ProjectContractMilestoneUpdatePayload(BaseModel):
    title: str | None = None
    planned_date: str | None = None
    amount: float | None = None
    note: str | None = None
    status: str | None = None


class CalculatorRoomCreatePayload(BaseModel):
    name: str | None = None
    ceiling_height_m: float = 2.7
    auto_perimeter_calc: bool = False
    perimeter_factor: float = 1.15


class CalculatorFloorSectionPayload(BaseModel):
    length_m: float | None = None
    width_m: float | None = None


class CalculatorOpeningPayload(BaseModel):
    opening_type: str = "window"
    width_m: float | None = None
    height_m: float | None = None
    quantity: float | None = 1
    area_m2: float | None = None
    note: str | None = None


class CalculatorRoomUpdatePayload(BaseModel):
    name: str
    ceiling_height_m: float
    manual_floor_area_m2: float | None = None
    auto_perimeter_calc: bool = False
    perimeter_factor: float = 1.15
    note: str | None = None
    walls_m: list[float] = Field(default_factory=list)
    floor_sections: list[CalculatorFloorSectionPayload] = Field(default_factory=list)
    openings: list[CalculatorOpeningPayload] = Field(default_factory=list)


class CalculatorWarmFloorRoomPayload(BaseModel):
    room_id: int
    selected: bool = False
    area_m2_override: float | None = None
    note: str | None = None


class CalculatorWarmFloorUpdatePayload(BaseModel):
    work_price_per_m2: float = 1600
    pipe_m_per_m2: float = 6
    max_contour_area_m2: float = 15
    small_zone_area_m2: float = 5
    manifold_work_price: float = 6000
    manifold_material_price: float = 20000
    pump_work_price: float = 8000
    pump_material_price: float = 25000
    pipe_price_per_m: float = 170
    pump_rooms_threshold: int = 3
    pump_contours_threshold: int = 4
    rooms: list[CalculatorWarmFloorRoomPayload] = Field(default_factory=list)


class CalculatorFlooringCoveringPayload(BaseModel):
    title: str
    material_price_per_m2: float = 0
    labor_price_per_m2: float = 0
    base_waste_percent: float = 0
    underlay_mode: str = "none"
    underlay_consumption_per_m2: float = 1
    glue_consumption_per_m2: float = 0
    glue_unit: str = "кг"
    glue_price_per_unit: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "л"
    primer_price_per_unit: float = 0
    svp_consumption_per_m2: float = 0
    svp_unit: str = "шт"
    svp_price_per_unit: float = 0
    grout_consumption_per_m2: float = 0
    grout_unit: str = "кг"
    grout_price_per_unit: float = 0
    needs_plinth: bool = True
    instrument_price_per_m2: float = 0
    note: str | None = None


class CalculatorFlooringPreparationPayload(BaseModel):
    title: str
    labor_price_per_m2: float = 0
    material_price_per_m2: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "л"
    primer_price_per_unit: float = 0
    note: str | None = None


class CalculatorFlooringLayoutPayload(BaseModel):
    title: str
    labor_multiplier: float = 1
    extra_waste_percent: float = 0
    note: str | None = None


class CalculatorFlooringRoomPayload(BaseModel):
    room_id: int
    selected: bool = False
    covering_id: int | None = None
    preparation_id: int | None = None
    layout_id: int | None = None
    area_m2_override: float | None = None
    perimeter_m_override: float | None = None
    plinth_m_override: float | None = None
    note: str | None = None


class CalculatorFlooringUpdatePayload(BaseModel):
    include_underlay: bool = True
    include_plinth: bool = True
    include_demolition: bool = False
    include_preparation: bool = True
    demolition_price_per_m2: float = 150
    underlay_price_per_m2: float = 120
    plinth_material_price_per_m: float = 180
    plinth_install_price_per_m: float = 250
    threshold_profile_count: int = 0
    threshold_profile_price: float = 900
    rooms: list[CalculatorFlooringRoomPayload] = Field(default_factory=list)


class CalculatorWallFinishCoveringPayload(BaseModel):
    title: str
    material_price_per_m2: float = 0
    labor_price_per_m2: float = 0
    base_waste_percent: float = 0
    glue_consumption_per_m2: float = 0
    glue_unit: str = "кг"
    glue_price_per_unit: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "л"
    primer_price_per_unit: float = 0
    putty_consumption_per_m2: float = 0
    putty_unit: str = "кг"
    putty_price_per_unit: float = 0
    mesh_consumption_per_m2: float = 0
    mesh_unit: str = "м²"
    mesh_price_per_unit: float = 0
    instrument_price_per_m2: float = 0
    note: str | None = None


class CalculatorWallFinishPreparationPayload(BaseModel):
    title: str
    labor_price_per_m2: float = 0
    material_price_per_m2: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "л"
    primer_price_per_unit: float = 0
    note: str | None = None


class CalculatorWallFinishLayoutPayload(BaseModel):
    title: str
    labor_multiplier: float = 1
    extra_waste_percent: float = 0
    note: str | None = None


class CalculatorWallFinishRoomPayload(BaseModel):
    room_id: int
    selected: bool = False
    covering_id: int | None = None
    preparation_id: int | None = None
    layout_id: int | None = None
    area_m2_override: float | None = None
    note: str | None = None


class CalculatorWallFinishUpdatePayload(BaseModel):
    include_preparation: bool = True
    include_demolition: bool = False
    demolition_price_per_m2: float = 140
    rooms: list[CalculatorWallFinishRoomPayload] = Field(default_factory=list)


class CalculatorDoorCatalogPayload(BaseModel):
    title: str
    width_mm: float
    height_mm: float
    thickness_mm: float | None = None
    purchase_price: float | None = None
    sale_price: float | None = None
    install_price: float | None = None
    note: str | None = None


class CalculatorProjectDoorPayload(BaseModel):
    door_catalog_id: int | None = None
    title: str | None = None
    opening_kind: str = "door"
    width_mm: float | None = None
    height_mm: float | None = None
    thickness_mm: float | None = None
    purchase_price: float | None = None
    sale_price: float | None = None
    install_price: float | None = None
    room_a_id: int | None = None
    room_b_id: int | None = None
    note: str | None = None


class CalculatorDoorComponentCatalogPayload(BaseModel):
    category_code: str
    title: str
    unit: str = "шт"
    purchase_price: float | None = None
    sale_price: float | None = None
    note: str | None = None


class CalculatorProjectDoorComponentPayload(BaseModel):
    component_catalog_id: int | None = None
    category_code: str | None = None
    title: str | None = None
    unit: str | None = None
    quantity: float = 1
    purchase_price: float | None = None
    sale_price: float | None = None
    note: str | None = None


def create_admin_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or load_settings()
    storage = BotStorage(resolved_settings.database_path)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await storage.initialize()
        await storage.ensure_runtime_settings(
            delivery_start=resolved_settings.default_delivery_start.strftime("%H:%M"),
            delivery_end=resolved_settings.default_delivery_end.strftime("%H:%M"),
            delivery_fallback=resolved_settings.default_delivery_fallback.strftime("%H:%M"),
        )
        app.state.settings = resolved_settings
        app.state.storage = storage
        yield

    app = FastAPI(
        title="Supply Bot Admin API",
        version="0.2.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://localhost:4173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_auth_routes(
        app,
        admin_login_payload_model=AdminLoginPayload,
    )
    register_support_routes(
        app,
        delivery_settings_payload_model=DeliverySettingsPayload,
    )
    register_request_routes(
        app,
        request_status_payload_model=RequestStatusPayload,
        request_action_result_model=RequestActionResult,
        request_delivery_payload_model=RequestDeliveryPayload,
        request_item_payload_model=RequestItemPayload,
    )
    register_calculator_routes(
        app,
        calculator_project_create_payload_model=CalculatorProjectCreatePayload,
        calculator_room_create_payload_model=CalculatorRoomCreatePayload,
        calculator_room_update_payload_model=CalculatorRoomUpdatePayload,
        calculator_warm_floor_update_payload_model=CalculatorWarmFloorUpdatePayload,
        calculator_flooring_covering_payload_model=CalculatorFlooringCoveringPayload,
        calculator_flooring_preparation_payload_model=CalculatorFlooringPreparationPayload,
        calculator_flooring_layout_payload_model=CalculatorFlooringLayoutPayload,
        calculator_flooring_update_payload_model=CalculatorFlooringUpdatePayload,
        calculator_wall_finish_covering_payload_model=CalculatorWallFinishCoveringPayload,
        calculator_wall_finish_preparation_payload_model=CalculatorWallFinishPreparationPayload,
        calculator_wall_finish_layout_payload_model=CalculatorWallFinishLayoutPayload,
        calculator_wall_finish_update_payload_model=CalculatorWallFinishUpdatePayload,
        calculator_door_catalog_payload_model=CalculatorDoorCatalogPayload,
        calculator_door_component_catalog_payload_model=CalculatorDoorComponentCatalogPayload,
        calculator_project_door_payload_model=CalculatorProjectDoorPayload,
        calculator_project_door_component_payload_model=CalculatorProjectDoorComponentPayload,
    )
    register_material_routes(
        app,
        family_create_payload_model=FamilyCreatePayload,
        variant_create_payload_model=VariantCreatePayload,
        sku_create_payload_model=SkuCreatePayload,
        alias_create_payload_model=AliasCreatePayload,
    )
    register_project_routes(
        app,
        project_create_payload_model=ProjectCreatePayload,
        project_update_payload_model=ProjectUpdatePayload,
        project_advance_create_payload_model=ProjectAdvanceCreatePayload,
        project_ledger_entry_create_payload_model=ProjectLedgerEntryCreatePayload,
        project_ledger_entry_update_payload_model=ProjectLedgerEntryUpdatePayload,
        project_ledger_document_update_payload_model=ProjectLedgerDocumentUpdatePayload,
        project_contract_update_payload_model=ProjectContractUpdatePayload,
        project_contract_milestone_update_payload_model=ProjectContractMilestoneUpdatePayload,
    )

    return app


def main() -> None:
    uvicorn.run(
        create_admin_app(),
        host="127.0.0.1",
        port=8000,
        log_level="info",
    )
