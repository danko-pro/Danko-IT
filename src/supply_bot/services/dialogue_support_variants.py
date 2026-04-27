from __future__ import annotations

from supply_bot.utils import normalize_text

class DialogueSupportVariantMixin:
    def _pick_variant(self, text: str, variants: list[dict]) -> dict | None:
        normalized = normalize_text(text)
        for variant in variants:
            if normalize_text(variant["display_name"]) in normalized:
                return variant
        for variant in variants:
            if normalized == normalize_text(variant["display_name"]):
                return variant
        return None

    async def _apply_material_correction(self, item_id: int, family: dict, text: str) -> bool:
        normalized = normalize_text(text)
        variant_hint = self._extract_variant_hint(normalized)
        updates: dict[str, object] = {}

        if variant_hint is not None:
            variants = await self.storage.list_variants(family["id"])
            variant_choice = self._pick_variant_by_hint(variants, variant_hint)
            family_name = family["canonical_name"]

            if variant_choice is not None:
                updates["variant_id"] = variant_choice["id"]
                updates["normalized_name"] = f"{family_name} {variant_choice['display_name']}"
            elif variant_hint == "ordinary":
                updates["variant_id"] = None
                updates["normalized_name"] = f"{family_name} обычный"
            elif variant_hint == "moisture_resistant":
                updates["normalized_name"] = f"{family_name} влагостойкий"

            updates["sku_id"] = None

        if not updates:
            return False

        await self.storage.update_request_item(item_id, **updates)
        return True

    def _extract_variant_hint(self, normalized_text: str) -> str | None:
        if "не влагост" in normalized_text or "обыч" in normalized_text:
            return "ordinary"
        if "влагост" in normalized_text:
            return "moisture_resistant"
        return None

    def _pick_variant_by_hint(self, variants: list[dict], hint: str) -> dict | None:
        if hint == "moisture_resistant":
            for variant in variants:
                if "влаг" in normalize_text(variant["display_name"]):
                    return variant
        if hint == "ordinary":
            for variant in variants:
                normalized_name = normalize_text(variant["display_name"])
                if "обыч" in normalized_name:
                    return variant
            for variant in variants:
                normalized_name = normalize_text(variant["display_name"])
                if "влаг" not in normalized_name:
                    return variant
        return None

    def _variant_prompt_order(self, variant: dict) -> tuple[int, str]:
        normalized_name = normalize_text(variant["display_name"])
        if "обыч" in normalized_name:
            return 0, normalized_name
        if "влаг" in normalized_name:
            return 1, normalized_name
        return 2, normalized_name
