from pydantic import BaseModel, Field


class CalculatorProjectCreatePayload(BaseModel):
    name: str
    note: str | None = None
    group_chat_id: int | None = None


class CalculatorProjectUpdatePayload(BaseModel):
    name: str
    residential_complex: str | None = None
    address: str | None = None
    entrance_section: str | None = None
    apartment: str | None = None
    floor: str | None = None
    lift_type: str | None = None
    site_access: str | None = None
    intercom_code: str | None = None
    loading_zone: str | None = None
    responsible_person: str | None = None
    note: str | None = None


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


class CalculatorWarmFloorMaterialItemPayload(BaseModel):
    title: str
    unit: str = "РєРѕРјРїР»."
    quantity: float = 1
    amount: float = 0


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
    pipe_material_title: str = "РўСЂСѓР±Р° PEX-a 16x2 РґР»СЏ РІРѕРґСЏРЅРѕРіРѕ С‚С‘РїР»РѕРіРѕ РїРѕР»Р°"
    manifold_material_items: list[CalculatorWarmFloorMaterialItemPayload] = Field(default_factory=list)
    pump_material_items: list[CalculatorWarmFloorMaterialItemPayload] = Field(default_factory=list)
    consumable_material_items: list[CalculatorWarmFloorMaterialItemPayload] = Field(default_factory=list)
    pump_rooms_threshold: int = 3
    pump_contours_threshold: int = 4
    rooms: list[CalculatorWarmFloorRoomPayload] = Field(default_factory=list)


class CalculatorWallFinishCoveringConsumablePayload(BaseModel):
    title: str = ""
    consumption_per_m2: float = 0
    unit: str = "шт"
    price_per_unit: float = 0


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
    custom_consumables: list[CalculatorWallFinishCoveringConsumablePayload] = Field(default_factory=list)
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
    unit: str = "С€С‚"
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
