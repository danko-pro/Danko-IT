from pydantic import BaseModel, Field


class PlumbingCatalogItemCreatePayload(BaseModel):
    source_code: str
    public_title: str
    category: str
    unit: str
    technical_title: str | None = None
    work_price: float = 0.0
    material_price: float = 0.0
    equipment_price: float = 0.0
    consumables_price: float = 0.0
    coefficient: float = 1.0
    catalog_group: str | None = None
    source: str | None = None
    note: str | None = None
    is_active: bool = True
    sort_order: int = 100


class PlumbingCatalogItemUpdatePayload(BaseModel):
    source_code: str | None = None
    public_title: str | None = None
    category: str | None = None
    unit: str | None = None
    technical_title: str | None = None
    work_price: float | None = None
    material_price: float | None = None
    equipment_price: float | None = None
    consumables_price: float | None = None
    coefficient: float | None = None
    catalog_group: str | None = None
    source: str | None = None
    note: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class PlumbingZoneCreatePayload(BaseModel):
    zone_code: str
    subgroup: str
    title: str
    description: str | None = None
    disclaimer: str | None = None
    risk_percent: float | None = None
    active_package_code: str | None = None
    is_active: bool = True
    sort_order: int = 100


class PlumbingZoneUpdatePayload(BaseModel):
    zone_code: str | None = None
    subgroup: str | None = None
    title: str | None = None
    description: str | None = None
    disclaimer: str | None = None
    risk_percent: float | None = None
    active_package_code: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class PlumbingZoneItemPayload(BaseModel):
    atomic_source_code: str
    atomic_item_id: int | None = None
    quantity: float = 0.0
    coefficient: float = 1.0
    sort_order: int = 0


class PlumbingZoneItemsReplacePayload(BaseModel):
    items: list[PlumbingZoneItemPayload] = Field(default_factory=list)


class PlumbingZonePackagePayload(BaseModel):
    package_code: str
    label: str | None = None
    sort_order: int = 0
    items: list[PlumbingZoneItemPayload] = Field(default_factory=list)


class PlumbingZonePackagesReplacePayload(BaseModel):
    packages: list[PlumbingZonePackagePayload] = Field(default_factory=list)
