from __future__ import annotations

from typing import Any


class EstimateDoorsStorageMixin:
    async def list_estimate_door_catalog(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, title, width_mm, height_mm, thickness_mm, area_m2,
                       purchase_price, sale_price, install_price,
                       note, is_active,
                       created_at, updated_at
                FROM estimate_door_catalog
                WHERE is_active = 1
                ORDER BY height_mm, width_mm, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_door_catalog_item(
        self,
        *,
        title: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | None = None,
        purchase_price: float | None = None,
        sale_price: float | None = None,
        install_price: float | None = None,
        note: str | None = None,
    ) -> int:
        area_m2 = round((width_mm / 1000.0) * (height_mm / 1000.0), 4)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_door_catalog (
                    title, width_mm, height_mm, thickness_mm, area_m2,
                    purchase_price, sale_price, install_price, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    width_mm,
                    height_mm,
                    thickness_mm,
                    area_m2,
                    purchase_price,
                    sale_price,
                    install_price,
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

    async def list_estimate_project_doors(self, project_id: int) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT epd.id, epd.project_id, epd.door_catalog_id, epd.title, epd.opening_kind,
                       epd.width_mm, epd.height_mm, epd.thickness_mm, epd.area_m2,
                       epd.purchase_price, epd.sale_price, epd.install_price,
                       epd.room_a_id, epd.room_b_id, epd.note, epd.created_at, epd.updated_at,
                       edc.title AS catalog_title,
                       edc.purchase_price AS catalog_purchase_price,
                       edc.sale_price AS catalog_sale_price,
                       edc.install_price AS catalog_install_price,
                       ra.name AS room_a_name,
                       rb.name AS room_b_name
                FROM estimate_project_doors epd
                LEFT JOIN estimate_door_catalog edc ON edc.id = epd.door_catalog_id
                LEFT JOIN estimate_rooms ra ON ra.id = epd.room_a_id
                LEFT JOIN estimate_rooms rb ON rb.id = epd.room_b_id
                WHERE epd.project_id = ?
                ORDER BY epd.id
                """,
                (project_id,),
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def list_estimate_door_component_catalog(self) -> list[dict[str, Any]]:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT id, category_code, title, unit, purchase_price, sale_price,
                       note, is_active, created_at, updated_at
                FROM estimate_door_component_catalog
                WHERE is_active = 1
                ORDER BY category_code, title, id
                """
            )
            rows = await cursor.fetchall()
        return [dict(row) for row in rows]

    async def create_estimate_door_component_catalog_item(
        self,
        *,
        category_code: str,
        title: str,
        unit: str = "шт",
        purchase_price: float | None = None,
        sale_price: float | None = None,
        note: str | None = None,
    ) -> int:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_door_component_catalog (
                    category_code, title, unit, purchase_price, sale_price, note
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    category_code,
                    title,
                    unit,
                    purchase_price,
                    sale_price,
                    note,
                ),
            )
            await db.commit()
            return int(cursor.lastrowid)

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

    async def create_estimate_project_door(
        self,
        *,
        project_id: int,
        door_catalog_id: int | None,
        title: str,
        opening_kind: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | None,
        purchase_price: float | None,
        sale_price: float | None,
        install_price: float | None,
        room_a_id: int | None,
        room_b_id: int | None,
        note: str | None = None,
    ) -> int:
        area_m2 = round((width_mm / 1000.0) * (height_mm / 1000.0), 4)
        async with self.connection() as db:
            cursor = await db.execute(
                """
                INSERT INTO estimate_project_doors (
                    project_id, door_catalog_id, title, opening_kind, width_mm, height_mm,
                    thickness_mm, area_m2, purchase_price, sale_price, install_price,
                    room_a_id, room_b_id, note
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    door_catalog_id,
                    title,
                    opening_kind,
                    width_mm,
                    height_mm,
                    thickness_mm,
                    area_m2,
                    purchase_price,
                    sale_price,
                    install_price,
                    room_a_id,
                    room_b_id,
                    note,
                ),
            )
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return int(cursor.lastrowid)

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
            cursor = await db.execute(
                "SELECT project_id FROM estimate_project_doors WHERE id = ?",
                (project_door_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            project_id = int(row["project_id"])
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
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return int(insert_cursor.lastrowid)

    async def update_estimate_project_door(
        self,
        door_id: int,
        *,
        door_catalog_id: int | None,
        title: str,
        opening_kind: str,
        width_mm: float,
        height_mm: float,
        thickness_mm: float | None,
        purchase_price: float | None,
        sale_price: float | None,
        install_price: float | None,
        room_a_id: int | None,
        room_b_id: int | None,
        note: str | None = None,
    ) -> int | None:
        area_m2 = round((width_mm / 1000.0) * (height_mm / 1000.0), 4)
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM estimate_project_doors WHERE id = ?",
                (door_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            project_id = int(row["project_id"])
            await db.execute(
                """
                UPDATE estimate_project_doors
                SET door_catalog_id = ?,
                    title = ?,
                    opening_kind = ?,
                    width_mm = ?,
                    height_mm = ?,
                    thickness_mm = ?,
                    area_m2 = ?,
                    purchase_price = ?,
                    sale_price = ?,
                    install_price = ?,
                    room_a_id = ?,
                    room_b_id = ?,
                    note = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (
                    door_catalog_id,
                    title,
                    opening_kind,
                    width_mm,
                    height_mm,
                    thickness_mm,
                    area_m2,
                    purchase_price,
                    sale_price,
                    install_price,
                    room_a_id,
                    room_b_id,
                    note,
                    door_id,
                ),
            )
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return project_id

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
            cursor = await db.execute(
                """
                SELECT epd.project_id
                FROM estimate_project_door_components epdc
                INNER JOIN estimate_project_doors epd ON epd.id = epdc.project_door_id
                WHERE epdc.id = ?
                """,
                (component_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            project_id = int(row["project_id"])
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
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return project_id

    async def delete_estimate_project_door_component(self, component_id: int) -> int | None:
        async with self.connection() as db:
            cursor = await db.execute(
                """
                SELECT epd.project_id
                FROM estimate_project_door_components epdc
                INNER JOIN estimate_project_doors epd ON epd.id = epdc.project_door_id
                WHERE epdc.id = ?
                """,
                (component_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            project_id = int(row["project_id"])
            await db.execute("DELETE FROM estimate_project_door_components WHERE id = ?", (component_id,))
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return project_id

    async def delete_estimate_project_door(self, door_id: int) -> int | None:
        async with self.connection() as db:
            cursor = await db.execute(
                "SELECT project_id FROM estimate_project_doors WHERE id = ?",
                (door_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            project_id = int(row["project_id"])
            await db.execute("DELETE FROM estimate_project_doors WHERE id = ?", (door_id,))
            await db.execute(
                """
                UPDATE estimate_projects
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (project_id,),
            )
            await db.commit()
            return project_id
