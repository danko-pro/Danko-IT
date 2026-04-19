from __future__ import annotations

from typing import Any

# Persistence для каталогов дверей и дверных комплектующих.


class EstimateDoorCatalogStorageMixin:
    # Каталог типовых дверей.
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
        area_m2 = self._estimate_door_area(width_mm, height_mm)
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

    # Каталог дверных комплектующих.
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
