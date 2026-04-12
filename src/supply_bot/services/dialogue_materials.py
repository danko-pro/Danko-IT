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


class DialogueMaterialsMixin:
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

    async def _handle_unknown_or_additional_materials(self, profile: dict, draft: dict, text: str) -> str | None:
        matches, unknown_segments = await self._analyze_material_mentions(text)
        if not matches and not unknown_segments:
            return None
        if matches:
            return await self._handle_material_matches(profile, draft, text, matches, unknown_segments)
        waiting_for = draft.get("waiting_for")
        waiting_item_id = draft.get("waiting_item_id")
        if waiting_item_id and waiting_for in {"variant", "thickness_mm", "size", "quantity", "comment"}:
            return await self._handle_interrupting_unknown_segments(
                profile,
                draft,
                waiting_item_id,
                waiting_for,
                unknown_segments,
                text,
            )
        return await self._reply_for_unknown_segments(profile, draft, unknown_segments, text)

    async def _handle_interrupting_unknown_segments(
        self,
        profile: dict,
        draft: dict,
        waiting_item_id: int,
        waiting_for: str,
        unknown_segments: list[str],
        full_text: str,
    ) -> str:
        current_item = await self.storage.get_request_item(waiting_item_id)
        current_family = (
            await self.storage.get_family(current_item["family_id"])
            if current_item and current_item.get("family_id")
            else None
        )
        if current_item is None or current_family is None:
            return await self._reply_for_unknown_segments(profile, draft, unknown_segments, full_text)

        deduped = self._dedupe_unknown_segments(unknown_segments)
        if not deduped:
            question = await self._question_for_field(current_family, current_item, waiting_for)
            return await self._narrate(question, profile, draft)

        detailed_segments = [segment for segment in deduped if not self._needs_manual_description(segment)]
        short_segments = [segment for segment in deduped if self._needs_manual_description(segment)]

        messages: list[str] = []
        for segment in detailed_segments:
            await self.storage.add_unknown_term(
                raw_term=segment[:120],
                full_message=full_text,
                chat_id=draft["chat_id"],
                message_id=None,
            )
            await self._create_manual_item_from_text(draft["id"], segment)
        if detailed_segments:
            if len(detailed_segments) == 1:
                messages.append(f"Позицию '{detailed_segments[0]}' добавил в заявку текстом.")
            else:
                messages.append("Дополнительные позиции добавил в заявку текстом.")

        if short_segments:
            for segment in short_segments:
                await self.storage.add_unknown_term(
                    raw_term=segment[:120],
                    full_message=full_text,
                    chat_id=draft["chat_id"],
                    message_id=None,
                )
            if len(short_segments) == 1:
                messages.append(
                    f"Позиции '{short_segments[0]}' пока нет в каталоге. "
                    "После этого шага просто опишите её одной фразой, и я добавлю её текстом."
                )
            else:
                messages.append(
                    "Часть дополнительных позиций пока не найдена в каталоге. "
                    "После этого шага просто опишите их одной фразой, и я добавлю их текстом."
                )

        question = await self._question_for_field(current_family, current_item, waiting_for)
        messages.append(question)
        return await self._narrate("\n\n".join(messages), profile, draft)

    async def _soft_unknown_notice(
        self, profile: dict, draft: dict, unknown_segments: list[str], full_text: str
    ) -> str:
        deduped = self._dedupe_unknown_segments(unknown_segments)
        for segment in deduped:
            await self.storage.add_unknown_term(
                raw_term=segment[:120],
                full_message=full_text,
                chat_id=draft["chat_id"],
                message_id=None,
            )
        if len(deduped) == 1:
            base_reply = (
                f"Позицию '{deduped[0]}' в каталоге пока не нашёл. "
                "Можно описать её позже свободной фразой, и я добавлю её в заявку текстом."
            )
        else:
            base_reply = (
                f"Позиции {', '.join(deduped)} пока нет в каталоге. "
                "Можно описать их позже свободной фразой, и я добавлю их в заявку текстом."
            )
        return await self._narrate(base_reply, profile, draft)

    async def _reply_for_unknown_segments(
        self, profile: dict, draft: dict, unknown_segments: list[str], full_text: str
    ) -> str:
        deduped = self._dedupe_unknown_segments(unknown_segments)
        if not deduped:
            return await self._narrate(
                "Пока не до конца понял позицию. Напишите, пожалуйста, материал чуть точнее.",
                profile,
                draft,
            )
        if len(deduped) == 1 and self._needs_manual_description(deduped[0]):
            stub_id = await self.storage.create_request_item(
                draft_id=draft["id"],
                family_id=None,
                variant_id=None,
                sku_id=None,
                raw_name=deduped[0],
                normalized_name=None,
            )
            await self.storage.update_draft_waiting(
                draft["id"],
                waiting_for="manual_item_description",
                waiting_item_id=stub_id,
                status="collecting",
            )
            await self.storage.add_unknown_term(
                raw_term=deduped[0][:120],
                full_message=full_text,
                chat_id=draft["chat_id"],
                message_id=None,
            )
            base_reply = (
                f"По позиции '{deduped[0]}' карточки пока нет. "
                "Опишите материал одной фразой так, как его нужно указать в заявке. Можно сразу с количеством."
            )
            return await self._narrate(base_reply, profile, draft)

        for segment in deduped:
            await self.storage.add_unknown_term(
                raw_term=segment[:120],
                full_message=full_text,
                chat_id=draft["chat_id"],
                message_id=None,
            )
            await self._create_manual_item_from_text(draft["id"], segment)
        return await self._advance_after_draft_change(profile, draft["id"])

    async def _create_manual_item_from_text(self, draft_id: int, text: str) -> int:
        quantity, unit = self._extract_quantity(text)
        cleaned_name = self._clean_manual_item_name(text)
        return await self.storage.create_request_item(
            draft_id=draft_id,
            family_id=None,
            variant_id=None,
            sku_id=None,
            raw_name=text.strip(),
            normalized_name=cleaned_name,
            quantity=quantity,
            unit=unit,
        )

    async def _apply_manual_item_answer(self, profile: dict, draft: dict, item_id: int, text: str) -> str:
        quantity, unit = self._extract_quantity(text)
        cleaned_name = self._clean_manual_item_name(text)
        await self.storage.update_request_item(
            item_id,
            raw_name=text.strip(),
            normalized_name=cleaned_name,
            quantity=quantity,
            unit=unit,
        )
        await self.storage.update_draft_waiting(
            draft["id"], waiting_for=None, waiting_item_id=None, status="collecting"
        )
        await self.storage.add_unknown_term(
            raw_term=cleaned_name[:120],
            full_message=text,
            chat_id=draft["chat_id"],
            message_id=None,
        )
        return await self._advance_after_draft_change(profile, draft["id"])

    async def _advance_after_draft_change(self, profile: dict, draft_id: int) -> str:
        items = await self.storage.list_request_items(draft_id)
        for draft_item in items:
            other_family = (
                await self.storage.get_family(draft_item["family_id"]) if draft_item.get("family_id") else None
            )
            if other_family is None:
                continue
            other_missing = await self._next_missing_field(draft_item, other_family)
            if other_missing is not None:
                await self.storage.update_draft_waiting(
                    draft_id,
                    waiting_for=other_missing,
                    waiting_item_id=draft_item["id"],
                )
                question = await self._question_for_field(other_family, draft_item, other_missing)
                return await self._narrate(question, profile, {"id": draft_id})

        draft = await self.storage.get_draft(draft_id)
        if draft and draft.get("confirmed_delivery_date") and draft.get("confirmed_delivery_time"):
            await self.storage.update_draft_waiting(
                draft_id, waiting_for="confirmation", status="awaiting_confirmation"
            )
            summary = await self._build_summary(draft, profile)
            return await self._narrate(summary, profile, draft)

        await self.storage.update_draft_waiting(draft_id, waiting_for=None, waiting_item_id=None)
        base_reply = "Позиции записал. Теперь подскажите, пожалуйста, день и время доставки."
        return await self._narrate(base_reply, profile, {"id": draft_id})

    async def _handle_confirmation_correction(self, profile: dict, draft: dict, text: str) -> str | None:
        matches, unknown_segments = await self._analyze_material_mentions(text)
        if not matches and not unknown_segments:
            return None
        normalized = normalize_text(text)
        if (
            not matches
            and unknown_segments
            and not any(
                marker in normalized for marker in ("добав", "забыл", "ещё", "еще", "нужен", "нужна", "нужно", "нужны")
            )
        ):
            return None
        await self.storage.update_draft_waiting(
            draft["id"], waiting_for=None, waiting_item_id=None, status="collecting"
        )
        return await self._handle_material_matches(profile, draft, text, matches, unknown_segments)
