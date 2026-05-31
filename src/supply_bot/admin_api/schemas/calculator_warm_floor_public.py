from __future__ import annotations

from pydantic import BaseModel, Field


class PublicWarmFloorConfigPayload(BaseModel):
    version: str | None = None
    water_labor_rate_per_m2: float | None = Field(default=None, ge=0)
    pipe_meters_per_m2: float | None = Field(default=None, ge=0)
    max_circuit_area_m2: float | None = Field(default=None, gt=0)
    pump_room_threshold: int | None = Field(default=None, ge=1)
    pump_circuit_threshold: int | None = Field(default=None, ge=1)
    pipe_price_per_meter: float | None = Field(default=None, ge=0)
    chase_labor_per_meter: float | None = Field(default=None, ge=0)
    small_loop_fittings_material: float | None = Field(default=None, ge=0)
    small_loop_control_head_material: float | None = Field(default=None, ge=0)
    small_loop_connection_labor: float | None = Field(default=None, ge=0)
    manifold_labor: float | None = Field(default=None, ge=0)
    manifold_material: float | None = Field(default=None, ge=0)
    pump_labor: float | None = Field(default=None, ge=0)
    pump_material: float | None = Field(default=None, ge=0)
    electric_mat_price_per_m2: float | None = Field(default=None, ge=0)
    electric_breaker_material: float | None = Field(default=None, ge=0)
    thermostat_material: float | None = Field(default=None, ge=0)
    electric_wire_material: float | None = Field(default=None, ge=0)
    electric_installation_labor: float | None = Field(default=None, ge=0)


__all__ = ["PublicWarmFloorConfigPayload"]
