from __future__ import annotations

from fastapi import FastAPI

from supply_bot.admin_api.app_routes_auth import register_auth_routes
from supply_bot.admin_api.app_routes_materials import register_material_routes
from supply_bot.admin_api.app_routes_projects import register_project_routes
from supply_bot.admin_api.app_routes_public import (
    register_public_catalog_routes,
    register_public_routes,
)
from supply_bot.admin_api.app_routes_requests import register_request_routes
from supply_bot.admin_api.app_routes_support import register_support_routes
from supply_bot.admin_api.calculator_routes import register_calculator_routes
from supply_bot.admin_api.schemas import (
    AdminLoginPayload,
    AliasCreatePayload,
    CalculatorDoorCatalogPayload,
    CalculatorDoorComponentCatalogPayload,
    CalculatorFlooringCoveringPayload,
    CalculatorFlooringLayoutPayload,
    CalculatorFlooringPreparationPayload,
    CalculatorFlooringUpdatePayload,
    CalculatorProjectCreatePayload,
    CalculatorProjectDoorComponentPayload,
    CalculatorProjectDoorPayload,
    CalculatorProjectUpdatePayload,
    CalculatorRoomCreatePayload,
    CalculatorRoomUpdatePayload,
    CalculatorWallFinishCoveringPayload,
    CalculatorWallFinishLayoutPayload,
    CalculatorWallFinishPreparationPayload,
    CalculatorWallFinishUpdatePayload,
    CalculatorWarmFloorUpdatePayload,
    DeliverySettingsPayload,
    FamilyCreatePayload,
    ProjectAdvanceCreatePayload,
    ProjectContractMilestoneUpdatePayload,
    ProjectContractUpdatePayload,
    ProjectCreatePayload,
    ProjectLedgerDocumentUpdatePayload,
    ProjectLedgerEntryCreatePayload,
    ProjectLedgerEntryUpdatePayload,
    ProjectUpdatePayload,
    PublicLeadPayload,
    RequestActionResult,
    RequestDeliveryPayload,
    RequestItemPayload,
    RequestStatusPayload,
    SkuCreatePayload,
    UserRegisterPayload,
    VariantCreatePayload,
)


def register_admin_routes(app: FastAPI) -> None:
    register_public_routes(
        app,
        public_lead_payload_model=PublicLeadPayload,
    )
    register_public_catalog_routes(app)
    register_auth_routes(
        app,
        admin_login_payload_model=AdminLoginPayload,
        user_register_payload_model=UserRegisterPayload,
    )
    register_support_routes(
        app,
        delivery_settings_payload_model=DeliverySettingsPayload,
    )
    register_request_routes(
        app,
        request_status_payload_model=RequestStatusPayload,
        request_action_result_model=RequestActionResult,
        request_delivery_payload_model=RequestDeliveryPayload,
        request_item_payload_model=RequestItemPayload,
    )
    register_calculator_routes(
        app,
        calculator_project_create_payload_model=CalculatorProjectCreatePayload,
        calculator_project_update_payload_model=CalculatorProjectUpdatePayload,
        calculator_room_create_payload_model=CalculatorRoomCreatePayload,
        calculator_room_update_payload_model=CalculatorRoomUpdatePayload,
        calculator_warm_floor_update_payload_model=CalculatorWarmFloorUpdatePayload,
        calculator_flooring_covering_payload_model=CalculatorFlooringCoveringPayload,
        calculator_flooring_preparation_payload_model=CalculatorFlooringPreparationPayload,
        calculator_flooring_layout_payload_model=CalculatorFlooringLayoutPayload,
        calculator_flooring_update_payload_model=CalculatorFlooringUpdatePayload,
        calculator_wall_finish_covering_payload_model=CalculatorWallFinishCoveringPayload,
        calculator_wall_finish_preparation_payload_model=CalculatorWallFinishPreparationPayload,
        calculator_wall_finish_layout_payload_model=CalculatorWallFinishLayoutPayload,
        calculator_wall_finish_update_payload_model=CalculatorWallFinishUpdatePayload,
        calculator_door_catalog_payload_model=CalculatorDoorCatalogPayload,
        calculator_door_component_catalog_payload_model=CalculatorDoorComponentCatalogPayload,
        calculator_project_door_payload_model=CalculatorProjectDoorPayload,
        calculator_project_door_component_payload_model=CalculatorProjectDoorComponentPayload,
    )
    register_material_routes(
        app,
        family_create_payload_model=FamilyCreatePayload,
        variant_create_payload_model=VariantCreatePayload,
        sku_create_payload_model=SkuCreatePayload,
        alias_create_payload_model=AliasCreatePayload,
    )
    register_project_routes(
        app,
        project_create_payload_model=ProjectCreatePayload,
        project_update_payload_model=ProjectUpdatePayload,
        project_advance_create_payload_model=ProjectAdvanceCreatePayload,
        project_ledger_entry_create_payload_model=ProjectLedgerEntryCreatePayload,
        project_ledger_entry_update_payload_model=ProjectLedgerEntryUpdatePayload,
        project_ledger_document_update_payload_model=ProjectLedgerDocumentUpdatePayload,
        project_contract_update_payload_model=ProjectContractUpdatePayload,
        project_contract_milestone_update_payload_model=ProjectContractMilestoneUpdatePayload,
    )


__all__ = ["register_admin_routes"]
