from __future__ import annotations

import re
from typing import Any

from sqlalchemy import and_, func, insert, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.domain.materials import MaterialSearchTarget
from supply_bot.storage_catalog.tables import (
    material_aliases,
    material_families,
    material_skus,
    material_variants,
    unknown_terms,
)
from supply_bot.utils import json_dumps, json_loads, normalize_text, slugify


class SqlAlchemyCatalogRepository:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        owner_user_id: int | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._owner_user_id = owner_user_id

    def for_owner(self, owner_user_id: int | None) -> SqlAlchemyCatalogRepository:
        return SqlAlchemyCatalogRepository(self._session_factory, owner_user_id=owner_user_id)

    def _visible_owner_clause(self, table) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return or_(table.c.owner_user_id.is_(None), table.c.owner_user_id == self._owner_user_id)

    def _write_owner_clause(self, table) -> Any:
        if self._owner_user_id is None:
            return table.c.owner_user_id.is_(None)
        return table.c.owner_user_id == self._owner_user_id

    def _family_row(self, row: Any | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["dialog_fields"] = json_loads(data.pop("dialog_fields_json"), default=[])
        return data

    def _sku_row(self, row: Any | None) -> dict[str, Any]:
        if row is None:
            return {}
        data = dict(row)
        data["extra"] = json_loads(data.pop("extra_json"), default={})
        return data

    def _split_alias_input(self, raw_value: str) -> list[str]:
        parts = [part.strip() for part in re.split(r"[,;\n]+", raw_value) if part.strip()]
        return parts or [raw_value.strip()]

    async def _unique_code(
        self,
        table,
        title: str,
        *,
        prefix: str,
        family_id: int | None = None,
    ) -> str:
        base = slugify(title, prefix=prefix)
        candidate = base
        index = 2

        while True:
            clauses = [table.c.code == candidate]
            if family_id is not None and "family_id" in table.c:
                clauses.append(table.c.family_id == family_id)
            async with self._session_factory() as session:
                result = await session.execute(select(table.c.id).where(and_(*clauses)).limit(1))
                exists = result.scalar_one_or_none()
            if exists is None:
                return candidate
            candidate = f"{base}_{index}"
            index += 1

    async def list_families(self) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_families.c.id,
                    material_families.c.code,
                    material_families.c.canonical_name,
                    material_families.c.category,
                    material_families.c.default_unit,
                    material_families.c.dialog_fields_json,
                    material_families.c.is_active,
                    material_families.c.owner_user_id,
                )
                .where(self._visible_owner_clause(material_families))
                .order_by(func.lower(material_families.c.canonical_name))
            )
            rows = result.mappings().all()
        return [self._family_row(row) for row in rows]

    async def get_family(self, family_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_families.c.id,
                    material_families.c.code,
                    material_families.c.canonical_name,
                    material_families.c.category,
                    material_families.c.default_unit,
                    material_families.c.dialog_fields_json,
                    material_families.c.is_active,
                    material_families.c.owner_user_id,
                )
                .where(material_families.c.id == family_id, self._visible_owner_clause(material_families))
                .limit(1)
            )
            row = result.mappings().first()
        return self._family_row(row) if row else None

    async def create_family(
        self,
        *,
        canonical_name: str,
        default_unit: str,
        dialog_fields: list[str],
        category: str | None = None,
    ) -> int:
        code = await self._unique_code(material_families, canonical_name, prefix="family")
        async with self._session_factory() as session:
            result = await session.execute(
                insert(material_families).values(
                    owner_user_id=self._owner_user_id,
                    code=code,
                    canonical_name=canonical_name.strip(),
                    category=category,
                    default_unit=default_unit,
                    dialog_fields_json=json_dumps(dialog_fields),
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def update_family_dialog_fields(self, family_id: int, dialog_fields: list[str]) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(material_families)
                .where(material_families.c.id == family_id, self._write_owner_clause(material_families))
                .values(dialog_fields_json=json_dumps(dialog_fields))
            )
            await session.commit()

    async def set_family_active(self, family_id: int, *, is_active: bool) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(material_families)
                .where(material_families.c.id == family_id, self._write_owner_clause(material_families))
                .values(is_active=is_active)
            )
            await session.commit()

    async def list_variants(self, family_id: int) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_variants.c.id,
                    material_variants.c.family_id,
                    material_variants.c.code,
                    material_variants.c.display_name,
                    material_variants.c.is_active,
                    material_variants.c.owner_user_id,
                )
                .where(material_variants.c.family_id == family_id, self._visible_owner_clause(material_variants))
                .order_by(func.lower(material_variants.c.display_name))
            )
            rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def get_variant(self, variant_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_variants.c.id,
                    material_variants.c.family_id,
                    material_variants.c.code,
                    material_variants.c.display_name,
                    material_variants.c.is_active,
                    material_variants.c.owner_user_id,
                )
                .where(material_variants.c.id == variant_id, self._visible_owner_clause(material_variants))
                .limit(1)
            )
            row = result.mappings().first()
        return dict(row) if row else None

    async def create_variant(self, family_id: int, display_name: str) -> int:
        code = await self._unique_code(material_variants, display_name, prefix="variant", family_id=family_id)
        async with self._session_factory() as session:
            result = await session.execute(
                insert(material_variants).values(
                    owner_user_id=self._owner_user_id,
                    family_id=family_id,
                    code=code,
                    display_name=display_name.strip(),
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def set_variant_active(self, variant_id: int, *, is_active: bool) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(material_variants)
                .where(material_variants.c.id == variant_id, self._write_owner_clause(material_variants))
                .values(is_active=is_active)
            )
            await session.commit()

    async def list_skus(
        self,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = [self._visible_owner_clause(material_skus)]
        if family_id is not None:
            clauses.append(material_skus.c.family_id == family_id)
        if variant_id is not None:
            clauses.append(material_skus.c.variant_id == variant_id)

        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_skus.c.id,
                    material_skus.c.family_id,
                    material_skus.c.variant_id,
                    material_skus.c.title,
                    material_skus.c.brand,
                    material_skus.c.supplier,
                    material_skus.c.supplier_article,
                    material_skus.c.unit,
                    material_skus.c.length_mm,
                    material_skus.c.width_mm,
                    material_skus.c.thickness_mm,
                    material_skus.c.area_m2,
                    material_skus.c.extra_json,
                    material_skus.c.source_description,
                    material_skus.c.is_active,
                    material_skus.c.owner_user_id,
                )
                .where(and_(*clauses))
                .order_by(func.lower(material_skus.c.title))
            )
            rows = result.mappings().all()
        return [self._sku_row(row) for row in rows]

    async def get_sku(self, sku_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_skus.c.id,
                    material_skus.c.family_id,
                    material_skus.c.variant_id,
                    material_skus.c.title,
                    material_skus.c.brand,
                    material_skus.c.supplier,
                    material_skus.c.supplier_article,
                    material_skus.c.unit,
                    material_skus.c.length_mm,
                    material_skus.c.width_mm,
                    material_skus.c.thickness_mm,
                    material_skus.c.area_m2,
                    material_skus.c.extra_json,
                    material_skus.c.source_description,
                    material_skus.c.is_active,
                    material_skus.c.owner_user_id,
                )
                .where(material_skus.c.id == sku_id, self._visible_owner_clause(material_skus))
                .limit(1)
            )
            row = result.mappings().first()
        return self._sku_row(row) if row else None

    async def create_sku(
        self,
        *,
        family_id: int,
        variant_id: int | None,
        title: str,
        article: str | None,
        brand: str | None,
        unit: str,
        thickness_mm: float | None,
        length_mm: float | None,
        width_mm: float | None,
        source_description: str | None = None,
        supplier: str = "manual",
        extra: dict[str, Any] | None = None,
    ) -> int:
        async with self._session_factory() as session:
            result = await session.execute(
                insert(material_skus).values(
                    owner_user_id=self._owner_user_id,
                    family_id=family_id,
                    variant_id=variant_id,
                    title=title.strip(),
                    brand=brand.strip() if brand else None,
                    supplier=supplier,
                    supplier_article=article.strip() if article else None,
                    unit=unit,
                    length_mm=length_mm,
                    width_mm=width_mm,
                    thickness_mm=thickness_mm,
                    extra_json=json_dumps(extra or {}),
                    source_description=source_description.strip() if source_description else None,
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def set_sku_active(self, sku_id: int, *, is_active: bool) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(material_skus)
                .where(material_skus.c.id == sku_id, self._write_owner_clause(material_skus))
                .values(is_active=is_active)
            )
            await session.commit()

    async def list_aliases(
        self,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
        sku_id: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = [self._visible_owner_clause(material_aliases)]
        if family_id is not None:
            clauses.append(material_aliases.c.family_id == family_id)
        if variant_id is not None:
            clauses.append(material_aliases.c.variant_id == variant_id)
        if sku_id is not None:
            clauses.append(material_aliases.c.sku_id == sku_id)

        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_aliases.c.id,
                    material_aliases.c.alias,
                    material_aliases.c.normalized_alias,
                    material_aliases.c.family_id,
                    material_aliases.c.variant_id,
                    material_aliases.c.sku_id,
                    material_aliases.c.priority,
                    material_aliases.c.is_active,
                    material_aliases.c.owner_user_id,
                )
                .where(and_(*clauses))
                .order_by(material_aliases.c.priority.asc(), func.lower(material_aliases.c.alias))
            )
            rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def create_alias(
        self,
        alias: str,
        *,
        family_id: int | None = None,
        variant_id: int | None = None,
        sku_id: int | None = None,
        priority: int = 100,
    ) -> int:
        aliases = self._split_alias_input(alias)
        first_id: int | None = None
        async with self._session_factory() as session:
            for alias_value in aliases:
                result = await session.execute(
                    insert(material_aliases).values(
                        owner_user_id=self._owner_user_id,
                        alias=alias_value,
                        normalized_alias=normalize_text(alias_value),
                        family_id=family_id,
                        variant_id=variant_id,
                        sku_id=sku_id,
                        priority=priority,
                    )
                )
                if first_id is None:
                    first_id = int(result.inserted_primary_key[0])
            await session.commit()
        return first_id or 0

    async def set_alias_active(self, alias_id: int, *, is_active: bool) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(material_aliases)
                .where(material_aliases.c.id == alias_id, self._write_owner_clause(material_aliases))
                .values(is_active=is_active)
            )
            await session.commit()

    async def find_alias_matches(self, text: str) -> list[dict[str, Any]]:
        normalized_text = normalize_text(text)
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    material_aliases.c.id,
                    material_aliases.c.alias,
                    material_aliases.c.normalized_alias,
                    material_aliases.c.family_id,
                    material_aliases.c.variant_id,
                    material_aliases.c.sku_id,
                    material_aliases.c.priority,
                    material_aliases.c.owner_user_id,
                )
                .where(material_aliases.c.is_active.is_(True), self._visible_owner_clause(material_aliases))
                .order_by(
                    func.length(material_aliases.c.normalized_alias).desc(),
                    material_aliases.c.priority.asc(),
                )
            )
            rows = result.mappings().all()

        matches: list[dict[str, Any]] = []
        for row in rows:
            for candidate in self._split_alias_input(str(row["alias"])):
                normalized_alias = normalize_text(candidate)
                if normalized_alias and normalized_alias in normalized_text:
                    payload = dict(row)
                    payload["alias"] = candidate
                    payload["normalized_alias"] = normalized_alias
                    matches.append(payload)
        return matches

    async def search_material_targets(self, query: str) -> list[MaterialSearchTarget]:
        normalized_query = normalize_text(query)
        if len(normalized_query) < 2:
            return []

        needle = f"%{normalized_query}%"
        results: list[MaterialSearchTarget] = []
        async with self._session_factory() as session:
            family_rows = (
                await session.execute(
                    select(material_families.c.id, material_families.c.canonical_name.label("title"))
                    .where(
                        self._visible_owner_clause(material_families),
                        func.lower(material_families.c.canonical_name).like(needle),
                    )
                    .order_by(func.lower(material_families.c.canonical_name))
                    .limit(10)
                )
            ).mappings().all()
            for row in family_rows:
                results.append(
                    MaterialSearchTarget(
                        type="family",
                        id=int(row["id"]),
                        title=str(row["title"]),
                        family_id=int(row["id"]),
                        variant_id=None,
                        sku_id=None,
                    )
                )

            variant_rows = (
                await session.execute(
                    select(
                        material_variants.c.id,
                        material_variants.c.family_id,
                        material_variants.c.display_name.label("title"),
                    )
                    .where(
                        self._visible_owner_clause(material_variants),
                        func.lower(material_variants.c.display_name).like(needle),
                    )
                    .order_by(func.lower(material_variants.c.display_name))
                    .limit(10)
                )
            ).mappings().all()
            for row in variant_rows:
                results.append(
                    MaterialSearchTarget(
                        type="variant",
                        id=int(row["id"]),
                        title=str(row["title"]),
                        family_id=int(row["family_id"]),
                        variant_id=int(row["id"]),
                        sku_id=None,
                    )
                )

            sku_rows = (
                await session.execute(
                    select(
                        material_skus.c.id,
                        material_skus.c.family_id,
                        material_skus.c.variant_id,
                        material_skus.c.title,
                    )
                    .where(
                        self._visible_owner_clause(material_skus),
                        or_(
                            func.lower(material_skus.c.title).like(needle),
                            func.lower(func.coalesce(material_skus.c.supplier_article, "")).like(needle),
                        ),
                    )
                    .order_by(func.lower(material_skus.c.title))
                    .limit(10)
                )
            ).mappings().all()
            for row in sku_rows:
                results.append(
                    MaterialSearchTarget(
                        type="sku",
                        id=int(row["id"]),
                        title=str(row["title"]),
                        family_id=int(row["family_id"]),
                        variant_id=int(row["variant_id"]) if row["variant_id"] is not None else None,
                        sku_id=int(row["id"]),
                    )
                )

            alias_rows = (
                await session.execute(
                    select(
                        material_aliases.c.id,
                        material_aliases.c.alias.label("title"),
                        material_aliases.c.family_id,
                        material_aliases.c.variant_id,
                        material_aliases.c.sku_id,
                    )
                    .where(
                        self._visible_owner_clause(material_aliases),
                        material_aliases.c.normalized_alias.like(needle),
                    )
                    .order_by(func.lower(material_aliases.c.alias))
                    .limit(10)
                )
            ).mappings().all()
            for row in alias_rows:
                results.append(
                    MaterialSearchTarget(
                        type="alias",
                        id=int(row["id"]),
                        title=str(row["title"]),
                        family_id=int(row["family_id"]) if row["family_id"] is not None else None,
                        variant_id=int(row["variant_id"]) if row["variant_id"] is not None else None,
                        sku_id=int(row["sku_id"]) if row["sku_id"] is not None else None,
                    )
                )

        return results[:20]

    async def search_catalog(self, query: str) -> list[dict[str, int | str]]:
        targets = await self.search_material_targets(query)
        return [{"type": target.type, "id": target.id, "title": target.title} for target in targets]

    async def list_unknown_terms(self, *, limit: int = 20) -> list[dict[str, Any]]:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    unknown_terms.c.id,
                    unknown_terms.c.raw_term,
                    unknown_terms.c.normalized_term,
                    unknown_terms.c.full_message,
                    unknown_terms.c.chat_id,
                    unknown_terms.c.message_id,
                    unknown_terms.c.guessed_family_id,
                    unknown_terms.c.status,
                    unknown_terms.c.created_at,
                    unknown_terms.c.owner_user_id,
                )
                .where(unknown_terms.c.status == "new", self._visible_owner_clause(unknown_terms))
                .order_by(unknown_terms.c.created_at.desc())
                .limit(limit)
            )
            rows = result.mappings().all()
        return [dict(row) for row in rows]

    async def get_unknown_term(self, unknown_id: int) -> dict[str, Any] | None:
        async with self._session_factory() as session:
            result = await session.execute(
                select(
                    unknown_terms.c.id,
                    unknown_terms.c.raw_term,
                    unknown_terms.c.normalized_term,
                    unknown_terms.c.full_message,
                    unknown_terms.c.chat_id,
                    unknown_terms.c.message_id,
                    unknown_terms.c.guessed_family_id,
                    unknown_terms.c.status,
                    unknown_terms.c.created_at,
                    unknown_terms.c.owner_user_id,
                )
                .where(unknown_terms.c.id == unknown_id, self._visible_owner_clause(unknown_terms))
                .limit(1)
            )
            row = result.mappings().first()
        return dict(row) if row else None

    async def add_unknown_term(
        self,
        *,
        raw_term: str,
        full_message: str,
        chat_id: int,
        message_id: int | None = None,
        guessed_family_id: int | None = None,
    ) -> int:
        async with self._session_factory() as session:
            result = await session.execute(
                insert(unknown_terms).values(
                    owner_user_id=self._owner_user_id,
                    raw_term=raw_term.strip(),
                    normalized_term=normalize_text(raw_term),
                    full_message=full_message.strip(),
                    chat_id=chat_id,
                    message_id=message_id,
                    guessed_family_id=guessed_family_id,
                )
            )
            await session.commit()
            return int(result.inserted_primary_key[0])

    async def mark_unknown_term(self, unknown_id: int, *, status: str) -> None:
        async with self._session_factory() as session:
            await session.execute(
                update(unknown_terms)
                .where(unknown_terms.c.id == unknown_id, self._write_owner_clause(unknown_terms))
                .values(status=status)
            )
            await session.commit()
