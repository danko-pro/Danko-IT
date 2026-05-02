from pydantic import BaseModel, Field


class CalculatorFlooringCoveringPayload(BaseModel):
    title: str
    material_price_per_m2: float = 0
    labor_price_per_m2: float = 0
    base_waste_percent: float = 0
    underlay_mode: str = "none"
    underlay_consumption_per_m2: float = 1
    glue_consumption_per_m2: float = 0
    glue_unit: str = "kg"
    glue_price_per_unit: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "l"
    primer_price_per_unit: float = 0
    svp_consumption_per_m2: float = 0
    svp_unit: str = "pcs"
    svp_price_per_unit: float = 0
    grout_consumption_per_m2: float = 0
    grout_unit: str = "kg"
    grout_price_per_unit: float = 0
    custom_consumables: list["CalculatorFlooringCoveringConsumablePayload"] = Field(default_factory=list)
    needs_plinth: bool = True
    instrument_price_per_m2: float = 0
    note: str | None = None


class CalculatorFlooringCoveringConsumablePayload(BaseModel):
    title: str = ""
    consumption_per_m2: float = 0
    unit: str = "pcs"
    price_per_unit: float = 0


class CalculatorFlooringPreparationPayload(BaseModel):
    title: str
    labor_price_per_m2: float = 0
    material_price_per_m2: float = 0
    primer_consumption_per_m2: float = 0
    primer_unit: str = "l"
    primer_price_per_unit: float = 0
    note: str | None = None


class CalculatorFlooringLayoutPayload(BaseModel):
    title: str
    labor_multiplier: float = 1
    extra_waste_percent: float = 0
    note: str | None = None


class CalculatorFlooringRoomZonePayload(BaseModel):
    covering_id: int | None = None
    preparation_id: int | None = None
    layout_id: int | None = None
    area_m2: float | None = None
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
    zones: list[CalculatorFlooringRoomZonePayload] = Field(default_factory=list)


class CalculatorFlooringGlobalItemPayload(BaseModel):
    kind: str = "work"
    title: str = ""
    mode: str = "fixed"
    rate: float = 0
    quantity: float = 1
    enabled: bool = True


class CalculatorFlooringUpdatePayload(BaseModel):
    include_underlay: bool = True
    include_plinth: bool = True
    include_demolition: bool = False
    include_preparation: bool = True
    default_preparation_id: int | None = None
    demolition_price_per_m2: float = 150
    underlay_price_per_m2: float = 120
    plinth_material_price_per_m: float = 180
    plinth_install_price_per_m: float = 250
    threshold_profile_count: int = 0
    threshold_profile_price: float = 900
    global_items: list[CalculatorFlooringGlobalItemPayload] = Field(default_factory=list)
    rooms: list[CalculatorFlooringRoomPayload] = Field(default_factory=list)
