"""Схемы каталога материалов и алиасов."""

from pydantic import BaseModel, Field


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


class AliasCreatePayload(BaseModel):
    alias: str
    family_id: int | None = None
    variant_id: int | None = None
    sku_id: int | None = None
    priority: int = 100
