from __future__ import annotations

from typing import Any

# Persistence для дверей и проёмов, привязанных к estimate project.


class EstimateProjectDoorsStorageMixin:
    # Чтение списка дверей проекта с привязкой к каталогу и комнатам.
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

    # CRUD дверей проекта.
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
        area_m2 = self._estimate_door_area(width_mm, height_mm)
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
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return int(cursor.lastrowid)

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
        area_m2 = self._estimate_door_area(width_mm, height_mm)
        async with self.connection() as db:
            project_id = await self._get_estimate_project_id_for_project_door(db, door_id)
            if project_id is None:
                return None
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
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return project_id

    async def delete_estimate_project_door(self, door_id: int) -> int | None:
        async with self.connection() as db:
            project_id = await self._get_estimate_project_id_for_project_door(db, door_id)
            if project_id is None:
                return None
            await db.execute("DELETE FROM estimate_project_doors WHERE id = ?", (door_id,))
            await self._touch_estimate_project(db, project_id)
            await db.commit()
            return project_id
