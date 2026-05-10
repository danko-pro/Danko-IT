from __future__ import annotations

import math
from datetime import date, datetime, time
from typing import Any


class DialogueDecisionMutationMixin:
    async def _create_item_from_action(self, draft_id: int, payload: dict) -> int:
        family_id, variant_id, sku_id = await self._resolve_catalog_entities(payload)
        raw_text = str(payload.get("raw_text") or payload.get("normalized_name") or "позиция").strip()
        quantity = self._positive_number(payload.get("quantity"))
        thickness_mm = self._positive_number(payload.get("thickness_mm"))
        length_mm = self._positive_number(payload.get("length_mm"))
        width_mm = self._positive_number(payload.get("width_mm"))
        return await self.storage.create_request_item(
            draft_id=draft_id,
            family_id=family_id,
            variant_id=variant_id,
            sku_id=sku_id,
            raw_name=raw_text,
            normalized_name=payload.get("normalized_name"),
            quantity=quantity,
            unit=payload.get("unit"),
            thickness_mm=thickness_mm,
            length_mm=length_mm,
            width_mm=width_mm,
            note=self._sanitize_item_note(
                payload.get("note"),
                quantity=quantity,
                unit=payload.get("unit"),
            ),
        )

    async def _update_item_from_action(self, item: dict, payload: dict) -> None:
        family_id, variant_id, sku_id = await self._resolve_catalog_entities(payload)
        updates: dict[str, Any] = {}
        for field in (
            "raw_text",
            "normalized_name",
            "quantity",
            "unit",
            "thickness_mm",
            "length_mm",
            "width_mm",
            "note",
        ):
            if payload.get(field) is not None:
                target_field = "raw_name" if field == "raw_text" else field
                if field == "note":
                    updates[target_field] = self._sanitize_item_note(
                        payload.get("note"),
                        quantity=self._positive_number(payload.get("quantity", item.get("quantity"))),
                        unit=payload.get("unit", item.get("unit")),
                    )
                elif field in {"quantity", "thickness_mm", "length_mm", "width_mm"}:
                    value = self._positive_number(payload.get(field))
                    if value is not None:
                        updates[target_field] = value
                else:
                    updates[target_field] = payload.get(field)
        if family_id is not None:
            updates["family_id"] = family_id
        if variant_id is not None:
            updates["variant_id"] = variant_id
        if sku_id is not None:
            updates["sku_id"] = sku_id
        if updates:
            await self.storage.update_request_item(item["id"], **updates)

    async def _apply_delivery_action(
        self, profile: dict, draft_id: int, payload: dict, *, proposal: bool
    ) -> str | None:
        delivery_date = payload.get("delivery_date")
        delivery_time = payload.get("delivery_time")
        if not delivery_date or not delivery_time:
            return None
        parsed_date = self._parse_delivery_date(delivery_date)
        parsed_time = self._parse_delivery_time(delivery_time)
        if parsed_date is None or parsed_time is None:
            return None
        if proposal:
            await self.storage.update_draft_waiting(
                draft_id,
                waiting_for="delivery_proposal",
                proposed_delivery_date=parsed_date.isoformat(),
                proposed_delivery_time=parsed_time.strftime("%H:%M"),
                status="collecting",
            )
            return None
        await self.storage.update_draft_delivery(
            draft_id,
            requested_date=parsed_date.isoformat(),
            requested_time=parsed_time.strftime("%H:%M"),
        )
        return await self._validate_and_finalize_delivery(profile, draft_id, parsed_date, parsed_time)

    async def _apply_partial_delivery_action(
        self,
        profile: dict,
        draft_id: int,
        payload: dict,
        *,
        field: str,
    ) -> str | None:
        if field == "date":
            delivery_date = payload.get("delivery_date")
            if not delivery_date:
                return None
            parsed_date = self._parse_delivery_date(delivery_date)
            if parsed_date is None:
                return None
            await self.storage.update_draft_delivery(draft_id, requested_date=parsed_date.isoformat())
        else:
            delivery_time = payload.get("delivery_time")
            if not delivery_time:
                return None
            parsed_time = self._parse_delivery_time(delivery_time)
            if parsed_time is None:
                return None
            await self.storage.update_draft_delivery(draft_id, requested_time=parsed_time.strftime("%H:%M"))

        draft = await self.storage.get_draft(draft_id)
        if not draft:
            return None
        requested_date = draft.get("requested_delivery_date")
        requested_time = draft.get("requested_delivery_time")
        if requested_date and requested_time:
            parsed_date = self._parse_delivery_date(requested_date)
            parsed_time = self._parse_delivery_time(requested_time)
            if parsed_date is None or parsed_time is None:
                return None
            return await self._validate_and_finalize_delivery(
                profile,
                draft_id,
                parsed_date,
                parsed_time,
            )
        return None

    async def _rebuild_draft_from_action(self, draft_id: int, payload: dict) -> None:
        await self.storage.clear_request_items(draft_id)
        await self.storage.replace_draft_delivery(
            draft_id,
            requested_date=None,
            requested_time=None,
            confirmed_date=None,
            confirmed_time=None,
            proposed_date=None,
            proposed_time=None,
            waiting_for=None,
            status="collecting",
        )
        for replacement in payload.get("replacement_items") or []:
            await self._create_item_from_action(draft_id, replacement)

        replacement_date = payload.get("replacement_delivery_date")
        replacement_time = payload.get("replacement_delivery_time")
        parsed_replacement_date = self._parse_delivery_date(replacement_date)
        parsed_replacement_time = self._parse_delivery_time(replacement_time)
        if parsed_replacement_date and parsed_replacement_time:
            await self.storage.replace_draft_delivery(
                draft_id,
                requested_date=parsed_replacement_date.isoformat(),
                requested_time=parsed_replacement_time.strftime("%H:%M"),
                confirmed_date=parsed_replacement_date.isoformat(),
                confirmed_time=parsed_replacement_time.strftime("%H:%M"),
                proposed_date=None,
                proposed_time=None,
                waiting_for="confirmation",
                status="awaiting_confirmation",
            )

    def _positive_number(self, value: Any) -> float | None:
        if value is None or isinstance(value, bool):
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        if not math.isfinite(number) or number <= 0:
            return None
        return number

    def _parse_delivery_date(self, value: Any) -> date | None:
        if not value:
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            return None

    def _parse_delivery_time(self, value: Any) -> time | None:
        if not value:
            return None
        try:
            return datetime.strptime(str(value), "%H:%M").time()
        except ValueError:
            return None
