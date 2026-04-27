from __future__ import annotations

from fastapi import FastAPI

from supply_bot.admin_api.calculator_routes.core import register_calculator_core_routes
from supply_bot.admin_api.calculator_routes.doors import register_calculator_door_routes
from supply_bot.admin_api.calculator_routes.flooring import register_calculator_flooring_routes
from supply_bot.admin_api.calculator_routes.wall_finish import register_calculator_wall_finish_routes
from supply_bot.admin_api.calculator_routes.warm_floor import register_calculator_warm_floor_routes


def register_calculator_routes(
    app: FastAPI,
    *,
    calculator_project_create_payload_model,
    calculator_project_update_payload_model,
    calculator_room_create_payload_model,
    calculator_room_update_payload_model,
    calculator_warm_floor_update_payload_model,
    calculator_flooring_covering_payload_model,
    calculator_flooring_preparation_payload_model,
    calculator_flooring_layout_payload_model,
    calculator_flooring_update_payload_model,
    calculator_wall_finish_covering_payload_model,
    calculator_wall_finish_preparation_payload_model,
    calculator_wall_finish_layout_payload_model,
    calculator_wall_finish_update_payload_model,
    calculator_door_catalog_payload_model,
    calculator_door_component_catalog_payload_model,
    calculator_project_door_payload_model,
    calculator_project_door_component_payload_model,
) -> None:
    register_calculator_core_routes(
        app,
        calculator_project_create_payload_model=calculator_project_create_payload_model,
        calculator_project_update_payload_model=calculator_project_update_payload_model,
        calculator_room_create_payload_model=calculator_room_create_payload_model,
        calculator_room_update_payload_model=calculator_room_update_payload_model,
    )
    register_calculator_warm_floor_routes(
        app,
        calculator_warm_floor_update_payload_model=calculator_warm_floor_update_payload_model,
    )
    register_calculator_flooring_routes(
        app,
        calculator_flooring_covering_payload_model=calculator_flooring_covering_payload_model,
        calculator_flooring_preparation_payload_model=calculator_flooring_preparation_payload_model,
        calculator_flooring_layout_payload_model=calculator_flooring_layout_payload_model,
        calculator_flooring_update_payload_model=calculator_flooring_update_payload_model,
    )
    register_calculator_wall_finish_routes(
        app,
        calculator_wall_finish_covering_payload_model=calculator_wall_finish_covering_payload_model,
        calculator_wall_finish_preparation_payload_model=calculator_wall_finish_preparation_payload_model,
        calculator_wall_finish_layout_payload_model=calculator_wall_finish_layout_payload_model,
        calculator_wall_finish_update_payload_model=calculator_wall_finish_update_payload_model,
    )
    register_calculator_door_routes(
        app,
        calculator_door_catalog_payload_model=calculator_door_catalog_payload_model,
        calculator_door_component_catalog_payload_model=calculator_door_component_catalog_payload_model,
        calculator_project_door_payload_model=calculator_project_door_payload_model,
        calculator_project_door_component_payload_model=calculator_project_door_component_payload_model,
    )


__all__ = ["register_calculator_routes"]
