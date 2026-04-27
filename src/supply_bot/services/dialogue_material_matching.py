from __future__ import annotations

import re

from supply_bot.constants import AFFIRMATIVE_WORDS, CANCEL_WORDS, NEGATIVE_WORDS
from supply_bot.utils import normalize_text

GENERIC_REQUEST_WORDS = {
    "материал",
    "материалы",
    "заявка",
    "заказ",
    "заказы",
    "позиция",
    "позиции",
    "товар",
    "товары",
}
MATERIAL_SPLIT_PATTERN = re.compile(r"\s*(?:,|;|\+|/| и | ещё | еще )\s*", re.IGNORECASE)
MATERIAL_PREFIX_PATTERN = re.compile(
    r"^(?:мне\s+)?(?:нужен|нужна|нужно|нужны|надо|добавить|добавь|добавьте|нужно\s+добавить|"
    r"еще|ещё|и|ты\s+забыл|забыл|забыли)\s+",
    re.IGNORECASE,
)

class DialogueMaterialMatchingMixin:
    async def _analyze_material_mentions(self, text: str) -> tuple[list[dict], list[str]]:
        segments = self._extract_material_segments(text)
        matches: list[dict] = []
        unknown_segments: list[str] = []
        seen: set[tuple[int | None, int | None, int | None, str]] = set()

        for segment in segments:
            match = await self._match_material(segment)
            if match is not None:
                key = (
                    match.get("family_id"),
                    match.get("variant_id"),
                    match.get("sku_id"),
                    match.get("normalized_alias", ""),
                )
                if key not in seen:
                    seen.add(key)
                    matches.append(match)
                continue
            if self._looks_like_material_segment(segment):
                unknown_segments.append(segment[:120])

        if matches or unknown_segments:
            return matches, unknown_segments

        match = await self._match_material(text)
        if match is not None:
            return [match], []
        return [], []

    async def _match_material(self, text: str) -> dict | None:
        matches = await self.storage.find_alias_matches(text)
        if matches:
            return matches[0]
        return await self._catalog_fallback_match(text)

    async def _catalog_fallback_match(self, text: str) -> dict | None:
        normalized = normalize_text(text)
        if not normalized:
            return None
        results = await self.storage.search_catalog(text)
        for result in results:
            title_normalized = normalize_text(result["title"])
            if not title_normalized:
                continue
            if (
                normalized != title_normalized
                and normalized not in title_normalized
                and title_normalized not in normalized
            ):
                continue
            if result["type"] == "family":
                return {
                    "alias": text.strip(),
                    "normalized_alias": normalized,
                    "family_id": result["id"],
                    "variant_id": None,
                    "sku_id": None,
                }
            if result["type"] == "variant":
                variant = await self.storage.get_variant(result["id"])
                if variant is None:
                    continue
                return {
                    "alias": text.strip(),
                    "normalized_alias": normalized,
                    "family_id": variant["family_id"],
                    "variant_id": variant["id"],
                    "sku_id": None,
                }
            if result["type"] == "sku":
                sku = await self.storage.get_sku(result["id"])
                if sku is None:
                    continue
                return {
                    "alias": text.strip(),
                    "normalized_alias": normalized,
                    "family_id": sku["family_id"],
                    "variant_id": sku.get("variant_id"),
                    "sku_id": sku["id"],
                }
        return None

    def _extract_material_segments(self, text: str) -> list[str]:
        parts = [part.strip() for part in MATERIAL_SPLIT_PATTERN.split(text) if part.strip()]
        cleaned: list[str] = []
        for part in parts:
            candidate = part.strip()
            while True:
                updated = MATERIAL_PREFIX_PATTERN.sub("", candidate).strip()
                if updated == candidate:
                    break
                candidate = updated
            if candidate:
                cleaned.append(candidate)
        return cleaned or [text.strip()]

    def _looks_like_material_segment(self, text: str) -> bool:
        normalized = normalize_text(text)
        if (
            not normalized
            or normalized in AFFIRMATIVE_WORDS
            or normalized in NEGATIVE_WORDS
            or normalized in CANCEL_WORDS
        ):
            return False
        if self._parse_delivery(text) is not None:
            return False
        if re.fullmatch(r"\d+(?:[.,]\d+)?", normalized):
            return False
        return bool(re.search(r"[a-zа-я]", normalized, re.IGNORECASE))

    def _has_additional_material_intent(self, text: str) -> bool:
        normalized = normalize_text(text)
        if normalized.startswith("и "):
            return True
        return any(
            marker in normalized
            for marker in ("добав", "забыл", "ещё", "еще", " и ", "нужен", "нужна", "нужно", "нужны")
        )

    def _needs_manual_description(self, text: str) -> bool:
        cleaned = self._clean_manual_item_name(text)
        words = [part for part in normalize_text(cleaned).split() if part not in {"еще", "ещё"}]
        quantity, _ = self._extract_quantity(text)
        has_specs = self._extract_thickness(text) is not None or self._extract_size(text) is not None
        has_multiple_numbers = len(re.findall(r"\b\d+(?:[.,]\d+)?\b", normalize_text(text))) >= 2
        return quantity is None and not has_specs and not has_multiple_numbers and len(words) <= 2

    def _clean_manual_item_name(self, text: str) -> str:
        cleaned = MATERIAL_PREFIX_PATTERN.sub("", text).strip(" ,.;:-")
        cleaned = re.sub(r"\b(ещё|еще)\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\b\d+(?:[.,]\d+)?\s*(лист(?:ов|а)?|мешк(?:ов|а)?|шт|штук|упак(?:овк[аи])?|м2|м\.п\.)\b",
            "",
            cleaned,
            count=1,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.;:-")
        return cleaned or text.strip()

    def _dedupe_unknown_segments(self, unknown_segments: list[str]) -> list[str]:
        deduped: list[str] = []
        seen: set[str] = set()
        for segment in unknown_segments:
            normalized = normalize_text(segment)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(segment)
        return deduped

    def _is_generic_request_opening(self, unknown_segments: list[str]) -> bool:
        if not unknown_segments:
            return False
        normalized_segments = {
            normalize_text(self._clean_manual_item_name(segment))
            for segment in unknown_segments
            if normalize_text(self._clean_manual_item_name(segment))
        }
        return bool(normalized_segments) and normalized_segments.issubset(GENERIC_REQUEST_WORDS)
