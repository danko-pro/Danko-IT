from __future__ import annotations

from typing import Any

# Persistence для комплектующих, привязанных к дверям проекта.


class EstimateProjectDoorComponentsStorageMixin:
    # Чтение списка комплектующих по всем дверям проекта.
    async def list_estimate_project_door_components(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT epdc.id, epdc.project_door_id, epdc.component_catalog_id, epdc.category_code,
                       epdc.title, epdc.unit, epdc.quantity, epdc.purchase_price, epdc.sale_price,
                       epdc.note, epdc.created_at, epdc.updated_at,
                       epd.project_id,
                       edcc.title AS catalog_title,
                       edcc.purchase_price AS catalog_purchase_price,
                       edcc.sale_price AS catalog_sale_price
                FROM estimate_project_door_components epdc
                INNER JOIN estimate_project_doors epd ON epd.id = epdc.project_door_id
                LEFT JOIN estimate_door_component_catalog edcc ON edcc.id = epdc.component_catalog_id
                WHERE epd.project_id = ?
                ORDER BY epdc.project_door_id, epdc.id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    # CRUD комплектующих двери.
    async def create_estimate_project_door_component(
        self,
        *,
        project_door_id: int,
        component_catalog_id: int | None,
        category_code: str,
        title: str,
        unit: str,
        quantity: float,
        purchase_price: float | None,
        sale_price: float | None,
        note: str | None = None,
    ) -> int | None:
        async with self.connection() as db:
            project_id = await self._get_estimate_project_id_for_project_door(db, project_door_id)
            if project_id is None:
                return None
            insert_cursor = await db.execute(
                """
                INSERT INTO estimate_project_door_components (
                    project_door_id, component_catalog_id, category_code, title, unit,
                    quantity, purchase_price, sale_price, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_door_id,
                    component_catalog_id,
                    category_code,
                    title,
                    unit,
                    quantity,
                    purchase_price,
                    sale_price,
                    note,
                ),
            )
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return int(insert_cursor.lastrowid)

    async def update_estimate_project_door_component(
        self,
        component_id: int,
        *,
        component_catalog_id: int | None,
        category_code: str,
        title: str,
        unit: str,
        quantity: float,
        purchase_price: float | None,
        sale_price: float | None,
        note: str | None = None,
    ) -> int | None:
        async with self.connection() as db:
            project_id = await self._get_estimate_project_id_for_project_door_component(db, component_id)
            if project_id is None:
                return None
            await db.execute(
                """
                UPDATE estimate_project_door_components
                SET component_catalog_id = ?,
                    category_code = ?,
                    title = ?,
                    unit = ?,
                    quantity = ?,
                    purchase_price = ?,
                    sale_price = ?,
                    note = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    component_catalog_id,
                    category_code,
                    title,
                    unit,
                    quantity,
                    purchase_price,
                    sale_price,
                    note,
                    component_id,
                ),
            )
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return project_id

    async def delete_estimate_project_door_component(self, component_id: int) -> int | None:
        async with self.connection() as db:
            project_id = await self._get_estimate_project_id_for_project_door_component(db, component_id)
            if project_id is None:
                return None
            await db.execute("DELETE FROM estimate_project_door_components WHERE id = ?", (component_id,))
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return project_id
