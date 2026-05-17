from typing import Any

from fastapi import FastAPI, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_calculator_route_storage,
    load_created_catalog_item,
    load_estimate_project_payload,
)
from supply_bot.admin_api.error_mapping import resolve_application_result
from supply_bot.estimates.application.door_catalog import (
    CreateDoorCatalogItemCommand,
    CreateDoorCatalogItemUseCase,
    CreateDoorComponentCatalogItemCommand,
    CreateDoorComponentCatalogItemUseCase,
    ListDoorCatalogUseCase,
    ListDoorComponentCatalogUseCase,
)
from supply_bot.estimates.application.project_door_components import (
    CreateProjectDoorComponentCommand,
    CreateProjectDoorComponentUseCase,
    DeleteProjectDoorComponentCommand,
    DeleteProjectDoorComponentUseCase,
    ProjectDoorComponentValuesCommand,
    UpdateProjectDoorComponentCommand,
    UpdateProjectDoorComponentUseCase,
)
from supply_bot.estimates.application.project_doors import (
    CreateProjectDoorCommand,
    CreateProjectDoorUseCase,
    DeleteProjectDoorCommand,
    DeleteProjectDoorUseCase,
    ProjectDoorValuesCommand,
    UpdateProjectDoorCommand,
    UpdateProjectDoorUseCase,
)


def register_calculator_door_routes(
    app: FastAPI,
    *,
    calculator_door_catalog_payload_model,
    calculator_door_component_catalog_payload_model,
    calculator_project_door_payload_model,
    calculator_project_door_component_payload_model,
) -> None:
    @app.get("/api/calculator/door-catalog")
    async def calculator_door_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListDoorCatalogUseCase(storage_obj).execute()

    @app.post("/api/calculator/door-catalog")
    async def create_calculator_door_catalog_item(
        request: Request,
        payload: calculator_door_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateDoorCatalogItemCommand(
            title=payload.title,
            width_mm=payload.width_mm,
            height_mm=payload.height_mm,
            thickness_mm=payload.thickness_mm,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            install_price=payload.install_price,
            note=payload.note,
        )
        door_id = await resolve_application_result(CreateDoorCatalogItemUseCase(storage_obj).execute(command))

        return await load_created_catalog_item(
            storage_obj.list_estimate_door_catalog,
            created_id=door_id,
            detail="Door catalog item was not created",
        )

    @app.get("/api/calculator/door-component-catalog")
    async def calculator_door_component_catalog(request: Request) -> list[dict[str, Any]]:
        storage_obj = get_calculator_route_storage(request)
        return await ListDoorComponentCatalogUseCase(storage_obj).execute()

    @app.post("/api/calculator/door-component-catalog")
    async def create_calculator_door_component_catalog_item(
        request: Request,
        payload: calculator_door_component_catalog_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateDoorComponentCatalogItemCommand(
            category_code=payload.category_code,
            title=payload.title,
            unit=payload.unit,
            purchase_price=payload.purchase_price,
            sale_price=payload.sale_price,
            note=payload.note,
        )
        component_id = await resolve_application_result(
            CreateDoorComponentCatalogItemUseCase(storage_obj).execute(command)
        )

        return await load_created_catalog_item(
            storage_obj.list_estimate_door_component_catalog,
            created_id=component_id,
            detail="Door component catalog item was not created",
        )

    @app.post("/api/calculator/projects/{project_id}/doors")
    async def create_calculator_project_door(
        request: Request,
        project_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateProjectDoorCommand(
            project_id=project_id,
            door=_project_door_values_command(payload),
        )
        result_project_id = await resolve_application_result(CreateProjectDoorUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            result_project_id,
            detail="Project not found after door creation",
        )

    @app.patch("/api/calculator/project-doors/{door_id}")
    async def update_calculator_project_door(
        request: Request,
        door_id: int,
        payload: calculator_project_door_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = UpdateProjectDoorCommand(
            door_id=door_id,
            door=_project_door_values_command(payload),
        )
        project_id = await resolve_application_result(UpdateProjectDoorUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after door update",
        )

    @app.delete("/api/calculator/project-doors/{door_id}")
    async def delete_calculator_project_door(request: Request, door_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await resolve_application_result(
            DeleteProjectDoorUseCase(storage_obj).execute(DeleteProjectDoorCommand(door_id=door_id))
        )

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after door deletion",
        )

    @app.post("/api/calculator/project-doors/{door_id}/components")
    async def create_calculator_project_door_component(
        request: Request,
        door_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = CreateProjectDoorComponentCommand(
            door_id=door_id,
            component=_project_door_component_values_command(payload),
        )
        project_id = await resolve_application_result(CreateProjectDoorComponentUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component creation",
        )

    @app.patch("/api/calculator/door-components/{component_id}")
    async def update_calculator_project_door_component(
        request: Request,
        component_id: int,
        payload: calculator_project_door_component_payload_model,
    ) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        command = UpdateProjectDoorComponentCommand(
            component_id=component_id,
            component=_project_door_component_values_command(payload),
        )
        project_id = await resolve_application_result(UpdateProjectDoorComponentUseCase(storage_obj).execute(command))

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component update",
        )

    @app.delete("/api/calculator/door-components/{component_id}")
    async def delete_calculator_project_door_component(request: Request, component_id: int) -> dict[str, Any]:
        storage_obj = get_calculator_route_storage(request)
        project_id = await resolve_application_result(
            DeleteProjectDoorComponentUseCase(storage_obj).execute(
                DeleteProjectDoorComponentCommand(component_id=component_id)
            )
        )

        return await load_estimate_project_payload(
            storage_obj,
            project_id,
            detail="Project not found after component deletion",
        )


def _project_door_values_command(payload) -> ProjectDoorValuesCommand:
    return ProjectDoorValuesCommand(
        door_catalog_id=payload.door_catalog_id,
        title=payload.title,
        opening_kind=payload.opening_kind,
        width_mm=payload.width_mm,
        height_mm=payload.height_mm,
        thickness_mm=payload.thickness_mm,
        purchase_price=payload.purchase_price,
        sale_price=payload.sale_price,
        install_price=payload.install_price,
        room_a_id=payload.room_a_id,
        room_b_id=payload.room_b_id,
        note=payload.note,
    )


def _project_door_component_values_command(payload) -> ProjectDoorComponentValuesCommand:
    return ProjectDoorComponentValuesCommand(
        component_catalog_id=payload.component_catalog_id,
        category_code=payload.category_code,
        title=payload.title,
        unit=payload.unit,
        quantity=payload.quantity,
        purchase_price=payload.purchase_price,
        sale_price=payload.sale_price,
        note=payload.note,
    )
