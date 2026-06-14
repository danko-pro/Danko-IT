"""Flooring calculator routes package.

Aggregates the flooring route registrations that previously lived in the
``flooring.py`` monolith into one entry point.
"""

from fastapi import FastAPI

from supply_bot.admin_api.calculator_routes.flooring.assembly import register_assembly_routes
from supply_bot.admin_api.calculator_routes.flooring.assembly_mgmt import register_assembly_mgmt_routes
from supply_bot.admin_api.calculator_routes.flooring.coverings import register_coverings_routes
from supply_bot.admin_api.calculator_routes.flooring.estimates import register_estimates_routes
from supply_bot.admin_api.calculator_routes.flooring.layouts import register_layouts_routes
from supply_bot.admin_api.calculator_routes.flooring.preparations import register_preparations_routes


def register_calculator_flooring_routes(
    app: FastAPI,
    *,
    calculator_flooring_assembly_item_payload_model,
    calculator_flooring_catalog_assembly_replace_payload_model,
    calculator_flooring_covering_payload_model,
    calculator_flooring_preparation_payload_model,
    calculator_flooring_layout_payload_model,
    calculator_flooring_update_payload_model,
) -> None:
    register_assembly_routes(
        app,
        calculator_flooring_assembly_item_payload_model=calculator_flooring_assembly_item_payload_model,
    )
    register_coverings_routes(
        app,
        calculator_flooring_covering_payload_model=calculator_flooring_covering_payload_model,
    )
    register_preparations_routes(
        app,
        calculator_flooring_preparation_payload_model=calculator_flooring_preparation_payload_model,
    )
    register_layouts_routes(
        app,
        calculator_flooring_layout_payload_model=calculator_flooring_layout_payload_model,
    )
    register_assembly_mgmt_routes(
        app,
        calculator_flooring_catalog_assembly_replace_payload_model=calculator_flooring_catalog_assembly_replace_payload_model,
    )
    register_estimates_routes(
        app,
        calculator_flooring_update_payload_model=calculator_flooring_update_payload_model,
    )


__all__ = ["register_calculator_flooring_routes"]
