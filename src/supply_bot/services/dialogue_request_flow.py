from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from aiogram import Bot

from supply_bot.constants import DIALOG_FIELDS, NEGATIVE_WORDS
from supply_bot.services.dialogue_support import NO_COMMENT_SENTINEL
from supply_bot.utils import format_date, normalize_text


class DialogueRequestFlowMixin:
    async def _handle_material_matches(
        self,
        profile: dict,
        draft: dict,
        text: str,
        matches: list[dict],
        unknown_segments: list[str],
    ) -> str:
        created_items: list[tuple[int, dict]] = []
        attrs = self._extract_item_attributes(text)

        for match in matches:
            family = await self.storage.get_family(match["family_id"]) if match.get("family_id") else None
            variant = await self.storage.get_variant(match["variant_id"]) if match.get("variant_id") else None
            sku = await self.storage.get_sku(match["sku_id"]) if match.get("sku_id") else None
            if family is None:
                continue

            item_id = await self.storage.create_request_item(
                draft_id=draft["id"],
                family_id=match.get("family_id"),
                variant_id=match.get("variant_id"),
                sku_id=match.get("sku_id"),
                raw_name=match["alias"],
                normalized_name=sku["title"]
                if sku
                else (variant["display_name"] if variant else family["canonical_name"]),
                quantity=attrs["quantity"] if len(matches) == 1 else None,
                unit=(attrs["unit"] or (sku["unit"] if sku else family["default_unit"]))
                if len(matches) == 1
                else family["default_unit"],
                thickness_mm=(attrs["thickness_mm"] or (sku["thickness_mm"] if sku else None))
                if len(matches) == 1
                else (sku["thickness_mm"] if sku else None),
                length_mm=(attrs["length_mm"] or (sku["length_mm"] if sku else None))
                if len(matches) == 1
                else (sku["length_mm"] if sku else None),
                width_mm=(attrs["width_mm"] or (sku["width_mm"] if sku else None))
                if len(matches) == 1
                else (sku["width_mm"] if sku else None),
            )
            await self._apply_material_correction(item_id, family, text)
            created_items.append((item_id, family))

        if not created_items:
            return await self._reply_for_unknown_segments(profile, draft, unknown_segments or [text[:120]], text)

        first_item_id, first_family = created_items[0]
        reply = await self._advance_after_item_change(profile, draft["id"], first_item_id, first_family)
        if not unknown_segments:
            return reply

        unknown_reply = await self._soft_unknown_notice(profile, draft, unknown_segments, text)
        return f"{unknown_reply}\n\n{reply}"

    async def _handle_delivery_message(self, profile: dict, draft: dict, text: str) -> str | None:
        parsed = self._parse_delivery(text)
        if parsed is None:
            return None

        requested_date, requested_time = parsed
        if requested_date is None:
            base_reply = "Подскажите, пожалуйста, на какой день нужна доставка."
            return await self._narrate(base_reply, profile, draft)
        if requested_time is None:
            base_reply = "Принял день. Теперь подскажите точное время доставки."
            return await self._narrate(base_reply, profile, draft)

        await self.storage.update_draft_delivery(
            draft["id"],
            requested_date=requested_date.isoformat(),
            requested_time=requested_time.strftime("%H:%M"),
        )
        return await self._validate_and_finalize_delivery(profile, draft["id"], requested_date, requested_time)

    async def _apply_item_answer(
        self,
        profile: dict,
        draft: dict,
        item_id: int,
        field_code: str,
        text: str,
    ) -> str:
        item = await self.storage.get_request_item(item_id)
        if item is None:
            await self.storage.update_draft_waiting(draft["id"], waiting_for=None, waiting_item_id=None)
            return await self._narrate("Позиция потерялась, давайте добавим её ещё раз.", profile, draft)

        family = await self.storage.get_family(item["family_id"]) if item.get("family_id") else None
        if family is None:
            await self.storage.update_draft_waiting(draft["id"], waiting_for=None, waiting_item_id=None)
            return await self._narrate("Не нашёл семейство материала в каталоге.", profile, draft)

        correction_applied = await self._apply_material_correction(item_id, family, text)
        if correction_applied:
            item = await self.storage.get_request_item(item_id)
            if item is None:
                return await self._narrate("Позиция потерялась, давайте добавим её ещё раз.", profile, draft)
            if field_code == "variant":
                return await self._advance_after_item_change(profile, draft["id"], item_id, family)

        if field_code == "variant":
            variants = await self.storage.list_variants(family["id"])
            choice = self._pick_variant(text, variants)
            if choice is None:
                options = ", ".join(variant["display_name"] for variant in variants) or "варианты пока не заведены"
                return await self._narrate(
                    f"Пока не смог точно выбрать вариант. Напишите один из вариантов: {options}.",
                    profile,
                    draft,
                )
            await self.storage.update_request_item(
                item_id, variant_id=choice["id"], normalized_name=choice["display_name"]
            )
        elif field_code == "thickness_mm":
            thickness = self._extract_thickness(text)
            if thickness is None:
                return await self._narrate("Нужна толщина в миллиметрах, например 12.5 мм.", profile, draft)
            await self.storage.update_request_item(item_id, thickness_mm=thickness)
        elif field_code == "size":
            size = self._extract_size(text)
            if size is None:
                return await self._narrate("Напишите размер в формате 3000x1200.", profile, draft)
            await self.storage.update_request_item(item_id, length_mm=size[0], width_mm=size[1])
        elif field_code == "quantity":
            quantity, unit = self._extract_quantity(text)
            if quantity is None:
                if correction_applied:
                    return await self._advance_after_item_change(profile, draft["id"], item_id, family)
                return await self._narrate("Нужно количество, например 20 листов.", profile, draft)
            await self.storage.update_request_item(item_id, quantity=quantity, unit=unit or family["default_unit"])
        elif field_code == "comment":
            note = text.strip()
            normalized_note = normalize_text(note)
            await self.storage.update_request_item(
                item_id,
                note=NO_COMMENT_SENTINEL if not note or normalized_note in NEGATIVE_WORDS else note,
            )

        return await self._advance_after_item_change(profile, draft["id"], item_id, family)

    async def _advance_after_item_change(
        self,
        profile: dict,
        draft_id: int,
        item_id: int,
        family: dict,
    ) -> str:
        item = await self.storage.get_request_item(item_id)
        if item is None:
            return await self._narrate("Не удалось прочитать позицию после обновления.", profile, {"id": draft_id})

        missing = await self._next_missing_field(item, family)
        if missing is not None:
            await self.storage.update_draft_waiting(draft_id, waiting_for=missing, waiting_item_id=item_id)
            question = await self._question_for_field(family, item, missing)
            return await self._narrate(question, profile, {"id": draft_id})

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

    async def _next_missing_field(self, item: dict, family: dict) -> str | None:
        dialog_fields = family.get("dialog_fields") or ["quantity"]
        variants = await self.storage.list_variants(family["id"])
        for field_code in dialog_fields:
            if field_code == "variant" and variants and not item.get("variant_id"):
                return field_code
            if field_code == "thickness_mm" and not item.get("thickness_mm"):
                return field_code
            if field_code == "size" and (not item.get("length_mm") or not item.get("width_mm")):
                return field_code
            if field_code == "quantity" and not item.get("quantity"):
                return field_code
            if field_code == "comment" and not item.get("note"):
                return field_code
        return None

    async def _question_for_field(self, family: dict, item: dict, field_code: str) -> str:
        if field_code == "variant":
            variants = await self.storage.list_variants(family["id"])
            variants = sorted(variants, key=self._variant_prompt_order)
            family_name = family["canonical_name"].lower()
            options = ", ".join(variant["display_name"] for variant in variants)
            return f"Правильно понял, нужен {family_name}? Какой именно: {options}?"
        if field_code == "quantity":
            return f"Принял. Сколько нужно {self._quantity_unit_prompt(family['default_unit'])}?"
        definition = DIALOG_FIELDS[field_code]
        return definition.question

    async def _validate_and_finalize_delivery(
        self, profile: dict, draft_id: int, requested_date: date, requested_time
    ) -> str:
        start_time = datetime.strptime(profile["delivery_start"], "%H:%M").time()
        end_time = datetime.strptime(profile["delivery_end"], "%H:%M").time()
        fallback_time = datetime.strptime(profile["delivery_fallback"], "%H:%M").time()
        now_dt = self._now()
        requested_dt = self._local_datetime(requested_date, requested_time)

        if requested_dt <= now_dt:
            proposed_date, proposed_time = self._next_available_delivery_slot(
                requested_date=requested_date,
                start_time=start_time,
                end_time=end_time,
                fallback_time=fallback_time,
                now_dt=now_dt,
            )
            await self.storage.update_draft_waiting(
                draft_id,
                waiting_for="delivery_proposal",
                proposed_delivery_date=proposed_date.isoformat(),
                proposed_delivery_time=proposed_time.strftime("%H:%M"),
                status="collecting",
            )
            requested_date = proposed_date
            base_reply = (
                f"Это время уже прошло. Могу поставить на {proposed_date.strftime('%d.%m.%Y')} "
                f"к {proposed_time.strftime('%H:%M')}. Подходит?"
            )
            return await self._narrate(base_reply, profile, {"id": draft_id})

        if requested_time < start_time or requested_time > end_time:
            proposed_date, proposed_time = self._next_available_delivery_slot(
                requested_date=requested_date,
                start_time=start_time,
                end_time=end_time,
                fallback_time=fallback_time,
                now_dt=now_dt,
            )
            await self.storage.update_draft_waiting(
                draft_id,
                waiting_for="delivery_proposal",
                proposed_delivery_date=proposed_date.isoformat(),
                proposed_delivery_time=proposed_time.strftime("%H:%M"),
                status="collecting",
            )
            base_reply = (
                f"В это время доставка не работает. Могу поставить на {requested_date.strftime('%d.%m.%Y')} "
                f"к {proposed_time.strftime('%H:%M')}. Подходит?"
            )
            return await self._narrate(base_reply, profile, {"id": draft_id})

        await self.storage.update_draft_delivery(
            draft_id,
            confirmed_date=requested_date.isoformat(),
            confirmed_time=requested_time.strftime("%H:%M"),
            status="awaiting_confirmation",
        )
        await self.storage.update_draft_waiting(draft_id, waiting_for="confirmation")
        draft = await self.storage.get_draft(draft_id)
        summary = await self._build_summary(draft, profile)
        return await self._narrate(summary, profile, draft)

    def _next_available_delivery_slot(
        self,
        *,
        requested_date: date,
        start_time,
        end_time,
        fallback_time,
        now_dt: datetime,
    ) -> tuple[date, Any]:
        preferred_time = fallback_time
        if preferred_time < start_time or preferred_time > end_time:
            preferred_time = start_time

        candidate_date = requested_date if requested_date >= now_dt.date() else now_dt.date()
        candidate_dt = self._local_datetime(candidate_date, preferred_time)
        if candidate_dt > now_dt:
            return candidate_date, preferred_time

        if candidate_date == now_dt.date() and start_time > now_dt.time():
            same_day_start = self._local_datetime(candidate_date, start_time)
            if same_day_start > now_dt:
                return candidate_date, start_time

        return candidate_date + timedelta(days=1), preferred_time

    async def _build_summary(self, draft: dict, profile: dict, *, use_proposed: bool = False) -> str:
        items = await self.storage.list_request_items(draft["id"])
        lines = []
        for index, item in enumerate(items, start=1):
            lines.append(f"{index}. {self._format_item(item)}")

        delivery_date = draft.get("confirmed_delivery_date")
        delivery_time = draft.get("confirmed_delivery_time")
        if use_proposed:
            delivery_date = draft.get("proposed_delivery_date")
            delivery_time = draft.get("proposed_delivery_time")

        summary = [
            "Проверьте, пожалуйста, заявку:",
            f"Объект: {profile.get('object_name') or profile.get('title')}",
        ]
        if profile.get("address"):
            summary.append(f"Адрес: {profile['address']}")
        summary.append("Позиции:")
        summary.extend(lines or ["1. Позиции пока не добавлены"])
        summary.append(f"Доставка: {format_date(delivery_date)} к {delivery_time or 'не указано'}")
        summary.append("Если всё верно, напишите 'подтверждаю'.")
        return "\n".join(summary)

    async def _notify_admins(self, bot: Bot, summary: str, draft: dict) -> None:
        header = f"Новая подтверждённая заявка\nМастер: {draft['master_name']}\nЧерновик: #{draft['id']}\n\n"
        for admin_id in self.settings.admin_ids:
            await bot.send_message(admin_id, header + summary)
