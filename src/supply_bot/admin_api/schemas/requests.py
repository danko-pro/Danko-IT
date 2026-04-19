"""Схемы заявок и ручных действий администратора."""

from pydantic import BaseModel


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
