"""Схемы настроек поддержки и доставки."""

from pydantic import BaseModel


class DeliverySettingsPayload(BaseModel):
    delivery_start: str
    delivery_end: str
    delivery_fallback: str
