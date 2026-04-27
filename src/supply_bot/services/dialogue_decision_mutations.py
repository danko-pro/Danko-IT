from __future__ import annotations

from datetime import date, datetime
from typing import Any

class DialogueDecisionMutationMixin:
    async def _create_item_from_action(self, draft_id: int, payload: dict) -> int:
        family_id, variant_id, sku_id = await self._resolve_catalog_entities(payload)
        raw_text = str(payload.get("raw_text") or payload.get("normalized_name") or "позиция").strip()
        return await self.storage.create_request_item(
            draft_id=draft_id,
            family_id=family_id,
            variant_id=variant_id,
            sku_id=sku_id,
            raw_name=raw_text,
            normalized_name=payload.get("normalized_name"),
            quantity=payload.get("quantity"),
            unit=payload.get("unit"),
            thickness_mm=payload.get("thickness_mm"),
            length_mm=payload.get("length_mm"),
            width_mm=payload.get("width_mm"),
            note=self._sanitize_item_note(
                payload.get("note"),
                quantity=payload.get("quantity"),
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
                        quantity=payload.get("quantity", item.get("quantity")),
                        unit=payload.get("unit", item.get("unit")),
                    )
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
        parsed_date = date.fromisoformat(str(delivery_date))
        parsed_time = datetime.strptime(str(delivery_time), "%H:%M").time()
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
            parsed_date = date.fromisoformat(str(delivery_date))
            await self.storage.update_draft_delivery(draft_id, requested_date=parsed_date.isoformat())
        else:
            delivery_time = payload.get("delivery_time")
            if not delivery_time:
                return None
            parsed_time = datetime.strptime(str(delivery_time), "%H:%M").time()
            await self.storage.update_draft_delivery(draft_id, requested_time=parsed_time.strftime("%H:%M"))

        draft = await self.storage.get_draft(draft_id)
        if not draft:
            return None
        requested_date = draft.get("requested_delivery_date")
        requested_time = draft.get("requested_delivery_time")
        if requested_date and requested_time:
            return await self._validate_and_finalize_delivery(
                profile,
                draft_id,
                date.fromisoformat(str(requested_date)),
                datetime.strptime(str(requested_time), "%H:%M").time(),
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
        if replacement_date and replacement_time:
            await self.storage.replace_draft_delivery(
                draft_id,
                requested_date=str(replacement_date),
                requested_time=str(replacement_time),
                confirmed_date=str(replacement_date),
                confirmed_time=str(replacement_time),
                proposed_date=None,
                proposed_time=None,
                waiting_for="confirmation",
                status="awaiting_confirmation",
            )
