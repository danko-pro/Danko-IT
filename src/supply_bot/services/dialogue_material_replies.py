from __future__ import annotations

from supply_bot.utils import normalize_text


class DialogueMaterialReplyMixin:
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
