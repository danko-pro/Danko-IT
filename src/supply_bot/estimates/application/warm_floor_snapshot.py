from __future__ import annotations

from typing import Any

DEFAULT_PUBLIC_WARM_FLOOR_CONFIG: dict[str, Any] = {
    "config_key": "global",
    "version": "warm-floor-v1",
    "water_labor_rate_per_m2": 1600,
    "pipe_meters_per_m2": 6,
    "max_circuit_area_m2": 15,
    "pump_room_threshold": 3,
    "pump_circuit_threshold": 4,
    "pipe_price_per_meter": 168.78,
    "chase_labor_per_meter": 900,
    "small_loop_fittings_material": 1501.19,
    "small_loop_control_head_material": 7000,
    "small_loop_connection_labor": 4600,
    "manifold_labor": 6000,
    "manifold_material": 20000,
    "pump_labor": 8000,
    "pump_material": 25000,
    "electric_mat_price_per_m2": 2700,
    "electric_breaker_material": 1500,
    "thermostat_material": 5500,
    "electric_wire_material": 1000,
    "electric_installation_labor": 7000,
}

PUBLIC_WARM_FLOOR_UPDATE_FIELDS = frozenset(
    key for key in DEFAULT_PUBLIC_WARM_FLOOR_CONFIG if key not in {"config_key"}
)


def _number(config: dict[str, Any], key: str) -> float:
    value = config.get(key, DEFAULT_PUBLIC_WARM_FLOOR_CONFIG[key])
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return float(DEFAULT_PUBLIC_WARM_FLOOR_CONFIG[key])
    return float(value)


def _integer(config: dict[str, Any], key: str) -> int:
    return int(round(_number(config, key)))


def build_public_warm_floor_snapshot(config: dict[str, Any]) -> dict[str, Any]:
    version = config.get("version") or DEFAULT_PUBLIC_WARM_FLOOR_CONFIG["version"]
    return {
        "version": str(version),
        "water": {
            "waterLaborRatePerM2": _number(config, "water_labor_rate_per_m2"),
            "pipeMetersPerM2": _number(config, "pipe_meters_per_m2"),
            "maxCircuitAreaM2": _number(config, "max_circuit_area_m2"),
            "pumpRoomThreshold": _integer(config, "pump_room_threshold"),
            "pumpCircuitThreshold": _integer(config, "pump_circuit_threshold"),
            "pipePricePerMeter": _number(config, "pipe_price_per_meter"),
            "chaseLaborPerMeter": _number(config, "chase_labor_per_meter"),
            "smallLoopFittingsMaterial": _number(config, "small_loop_fittings_material"),
            "smallLoopControlHeadMaterial": _number(config, "small_loop_control_head_material"),
            "smallLoopConnectionLabor": _number(config, "small_loop_connection_labor"),
            "manifoldLabor": _number(config, "manifold_labor"),
            "manifoldMaterial": _number(config, "manifold_material"),
            "pumpLabor": _number(config, "pump_labor"),
            "pumpMaterial": _number(config, "pump_material"),
        },
        "electric": {
            "electricMatPricePerM2": _number(config, "electric_mat_price_per_m2"),
            "electricBreakerMaterial": _number(config, "electric_breaker_material"),
            "thermostatMaterial": _number(config, "thermostat_material"),
            "electricWireMaterial": _number(config, "electric_wire_material"),
            "electricInstallationLabor": _number(config, "electric_installation_labor"),
        },
    }


class BuildWarmFloorSnapshotUseCase:
    def __init__(self, storage) -> None:
        self._storage = storage

    async def build_public(self) -> dict[str, Any]:
        config = await self._storage.ensure_public_warm_floor_config(DEFAULT_PUBLIC_WARM_FLOOR_CONFIG)
        return build_public_warm_floor_snapshot(config)

    async def build_internal(self) -> dict[str, Any]:
        return await self.build_public()


__all__ = [
    "BuildWarmFloorSnapshotUseCase",
    "DEFAULT_PUBLIC_WARM_FLOOR_CONFIG",
    "PUBLIC_WARM_FLOOR_UPDATE_FIELDS",
    "build_public_warm_floor_snapshot",
]
