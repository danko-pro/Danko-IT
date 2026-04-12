from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from aiogram import Bot

from supply_bot.constants import AFFIRMATIVE_WORDS, NEGATIVE_WORDS
from supply_bot.utils import normalize_text


class DialogueDecisionMixin:
    async def _try_llm_decision(
        self,
        *,
        bot: Bot,
        profile: dict,
        chat_id: int,
        master_id: int,
        master_name: str,
        text: str,
        draft: dict | None,
        recent_chat_messages: list[dict],
    ) -> str | None:
        # LLM-first boundary:
        # semantic routing belongs to the model; code here should only provide
        # context, reject obviously unsafe low-confidence outputs, and apply
        # deterministic fallback for strict parsing/validation.
        if not self.settings.llm_enabled:
            return None
        if self._is_smalltalk_message(text) and draft is None:
            return None
        if draft is None:
            score = self._request_topic_score(text)
            if score < 3 and not (self._is_addressed_to_bot(text) and score >= 2):
                return None
        if self._should_bypass_llm_for_waiting_answer(draft, text):
            return None

        group_context = self._format_group_context(profile)
        draft_context = await self._format_decision_draft_context(draft)
        recent_chat_context = self._format_recent_messages_for_decision(recent_chat_messages)
        catalog_context = await self._format_catalog_context(text)
        decision = await self.decider.decide(
            current_message=text,
            group_context=group_context,
            draft_context=draft_context,
            recent_chat_context=recent_chat_context,
            catalog_context=catalog_context,
        )
        if not decision:
            return None
        decision = self._sanitize_llm_decision(decision, text)

        confidence = float(decision.get("confidence") or 0)
        intent = str(decision.get("intent") or "unknown")
        reply_text = str(decision.get("reply_text") or "").strip()
        actions = decision.get("actions") or []

        if confidence < 0.45 and intent in {"unknown", "offtopic"}:
            return None
        if not actions and intent in {"unknown", "offtopic"}:
            return None

        return await self._apply_llm_decision(
            bot=bot,
            profile=profile,
            chat_id=chat_id,
            master_id=master_id,
            master_name=master_name,
            draft=draft,
            reply_text=reply_text,
            actions=actions,
        )

    def _should_bypass_llm_for_waiting_answer(self, draft: dict | None, text: str) -> bool:
        if not draft:
            return False
        waiting_for = str(draft.get("waiting_for") or "")
        normalized = normalize_text(text)
        if not waiting_for:
            return False
        if waiting_for == "variant":
            return self._extract_variant_hint(normalized) is not None
        if waiting_for == "thickness_mm":
            return self._extract_thickness(text) is not None
        if waiting_for == "size":
            return self._extract_size(text) is not None
        if waiting_for == "quantity":
            quantity, _ = self._extract_quantity(text)
            return quantity is not None
        if waiting_for == "comment":
            return True
        if waiting_for == "delivery_proposal":
            return (
                normalized in AFFIRMATIVE_WORDS
                or normalized in NEGATIVE_WORDS
                or self._parse_delivery(text) is not None
            )
        if waiting_for == "confirmation":
            return normalized in AFFIRMATIVE_WORDS or normalized in NEGATIVE_WORDS
        return False

    def _sanitize_llm_decision(self, decision: dict[str, Any], text: str) -> dict[str, Any]:
        if not self._looks_like_readable_human_text(text):
            return decision

        reply_text = str(decision.get("reply_text") or "")
        normalized_reply = normalize_text(reply_text)
        corruption_markers = ("бит", "искаж", "нечита", "кодиров", "corrupt", "garbled", "unreadable")
        action_reasons = {
            normalize_text(str(action.get("reason") or ""))
            for action in decision.get("actions") or []
            if isinstance(action, dict)
        }
        says_corrupted = (
            any(marker in normalized_reply for marker in corruption_markers)
            or "user_message_illegible" in action_reasons
        )
        if not says_corrupted:
            return decision

        cleaned_actions: list[dict[str, Any]] = []
        fallback_question = "Понял. Давайте уточним заявку: что именно нужно, сколько и на когда доставка?"
        for action in decision.get("actions") or []:
            if not isinstance(action, dict):
                continue
            cleaned_action = dict(action)
            if normalize_text(str(cleaned_action.get("reason") or "")) == "user_message_illegible":
                cleaned_action["reason"] = "need_clarification"
            question = str(cleaned_action.get("question") or "")
            if any(marker in normalize_text(question) for marker in corruption_markers):
                cleaned_action["question"] = fallback_question
            cleaned_actions.append(cleaned_action)
        decision["actions"] = cleaned_actions
        decision["reply_text"] = fallback_question
        return decision

    def _looks_like_readable_human_text(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized:
            return False
        if "\ufffd" in text or "?" * 3 in text:
            return False
        return bool(re.search(r"[a-zа-я0-9]", normalized, re.IGNORECASE))

    async def _apply_llm_decision(
        self,
        *,
        bot: Bot,
        profile: dict,
        chat_id: int,
        master_id: int,
        master_name: str,
        draft: dict | None,
        reply_text: str,
        actions: list[dict],
    ) -> str | None:
        current_draft = draft
        final_reply = reply_text or None

        for action in self._order_decision_actions(actions):
            action_type = action.get("type")
            if action_type in {None, "no_op"}:
                continue

            if action_type == "show_summary":
                current_draft = await self._ensure_active_draft(current_draft, chat_id, master_id, master_name)
                current_draft = await self.storage.get_draft(current_draft["id"]) or current_draft
                final_reply = await self._build_progress_summary(current_draft, profile)
                continue

            if action_type == "request_clarification":
                question = action.get("question")
                if isinstance(question, str) and question.strip() and not final_reply:
                    final_reply = question.strip()
                continue

            if action_type == "cancel_request":
                current_draft = await self._ensure_active_draft(current_draft, chat_id, master_id, master_name)
                await self.storage.set_draft_status(current_draft["id"], status="cancelled")
                final_reply = reply_text or "Черновик заявки отменил."
                continue

            if action_type == "confirm_request":
                current_draft = await self._ensure_active_draft(current_draft, chat_id, master_id, master_name)
                await self.storage.set_draft_status(current_draft["id"], status="confirmed")
                fresh_draft = await self.storage.get_draft(current_draft["id"])
                if fresh_draft is not None:
                    summary = await self._build_summary(fresh_draft, profile)
                    await self._notify_admins(bot, summary, fresh_draft)
                final_reply = "Заявку подтвердил и передал администратору."
                continue

            current_draft = await self._ensure_active_draft(current_draft, chat_id, master_id, master_name)
            if action_type == "add_item":
                await self._create_item_from_action(current_draft["id"], action)
            elif action_type == "update_item":
                target = await self._resolve_item_target(current_draft["id"], action)
                if target is not None:
                    await self._update_item_from_action(target, action)
            elif action_type == "remove_item":
                target = await self._resolve_item_target(current_draft["id"], action)
                if target is not None:
                    await self.storage.delete_request_item(target["id"])
            elif action_type == "set_delivery":
                delivery_reply = await self._apply_delivery_action(profile, current_draft["id"], action, proposal=False)
                if delivery_reply:
                    final_reply = delivery_reply
            elif action_type == "set_delivery_date":
                delivery_reply = await self._apply_partial_delivery_action(
                    profile, current_draft["id"], action, field="date"
                )
                if delivery_reply:
                    final_reply = delivery_reply
            elif action_type == "set_delivery_time":
                delivery_reply = await self._apply_partial_delivery_action(
                    profile, current_draft["id"], action, field="time"
                )
                if delivery_reply:
                    final_reply = delivery_reply
            elif action_type == "propose_delivery_slot":
                delivery_reply = await self._apply_delivery_action(profile, current_draft["id"], action, proposal=True)
                if delivery_reply:
                    final_reply = delivery_reply
            elif action_type == "rebuild_draft":
                await self._rebuild_draft_from_action(current_draft["id"], action)
            current_draft = await self.storage.get_draft(current_draft["id"]) or current_draft

        return final_reply

    def _order_decision_actions(self, actions: list[dict]) -> list[dict]:
        priorities = {
            "cancel_request": 0,
            "rebuild_draft": 10,
            "remove_item": 20,
            "update_item": 30,
            "add_item": 40,
            "set_delivery": 50,
            "set_delivery_date": 51,
            "set_delivery_time": 52,
            "propose_delivery_slot": 60,
            "confirm_request": 70,
            "show_summary": 80,
            "request_clarification": 90,
            "no_op": 100,
        }
        return sorted(actions, key=lambda action: priorities.get(str(action.get("type") or "no_op"), 999))

    async def _ensure_active_draft(
        self,
        draft: dict | None,
        chat_id: int,
        master_id: int,
        master_name: str,
    ) -> dict:
        return draft or await self.storage.get_or_create_active_draft(
            chat_id=chat_id,
            master_id=master_id,
            master_name=master_name,
        )

    async def _format_decision_draft_context(self, draft: dict | None) -> str:
        if not draft or "id" not in draft:
            return "no active draft"
        saved_draft = await self.storage.get_draft(draft["id"])
        if saved_draft is None:
            return "no active draft"
        items = await self.storage.list_request_items(saved_draft["id"])
        lines = [
            f"status={saved_draft['status']}",
            f"waiting_for={saved_draft.get('waiting_for') or 'none'}",
            f"waiting_item_id={saved_draft.get('waiting_item_id') or 'none'}",
        ]
        for index, item in enumerate(items, start=1):
            lines.append(
                f"item[{index}]: raw={item.get('raw_name')}; normalized={item.get('normalized_name')}; "
                f"family={item.get('family_name')}; variant={item.get('variant_name')}; sku={item.get('sku_title')}; "
                f"qty={item.get('quantity')}; unit={item.get('unit')}; "
                f"thickness_mm={item.get('thickness_mm')}; "
                f"length_mm={item.get('length_mm')}; width_mm={item.get('width_mm')}; "
                f"note={item.get('note')}"
            )
        lines.append(
            "delivery: "
            f"requested={saved_draft.get('requested_delivery_date')} {saved_draft.get('requested_delivery_time')}; "
            f"confirmed={saved_draft.get('confirmed_delivery_date')} {saved_draft.get('confirmed_delivery_time')}; "
            f"proposed={saved_draft.get('proposed_delivery_date')} {saved_draft.get('proposed_delivery_time')}"
        )
        missing_branches = await self._collect_missing_branches(saved_draft, items)
        lines.append(f"missing_branches={', '.join(missing_branches) if missing_branches else 'none'}")
        return "\n".join(lines)

    async def _collect_missing_branches(self, draft: dict, items: list[dict] | None = None) -> list[str]:
        draft_items = items if items is not None else await self.storage.list_request_items(draft["id"])
        missing: list[str] = []
        if not draft_items:
            missing.append("items")
        for item in draft_items:
            if item.get("family_id"):
                family = await self.storage.get_family(item["family_id"])
                if family is None:
                    continue
                dialog_fields = family.get("dialog_fields") or ["quantity"]
                variants = await self.storage.list_variants(family["id"])
                if (
                    "variant" in dialog_fields
                    and variants
                    and not item.get("variant_id")
                    and "item_variant" not in missing
                ):
                    missing.append("item_variant")
                if "quantity" in dialog_fields and not item.get("quantity") and "item_quantity" not in missing:
                    missing.append("item_quantity")
                needs_specs = False
                if "thickness_mm" in dialog_fields and not item.get("thickness_mm"):
                    needs_specs = True
                if "size" in dialog_fields and (not item.get("length_mm") or not item.get("width_mm")):
                    needs_specs = True
                if needs_specs and "item_specs" not in missing:
                    missing.append("item_specs")
            elif not item.get("quantity") and "item_quantity" not in missing:
                missing.append("item_quantity")

        if not draft.get("requested_delivery_date") and not draft.get("confirmed_delivery_date"):
            missing.append("delivery_date")
        if not draft.get("requested_delivery_time") and not draft.get("confirmed_delivery_time"):
            missing.append("delivery_time")
        if (
            draft_items
            and draft.get("confirmed_delivery_date")
            and draft.get("confirmed_delivery_time")
            and draft.get("status") != "confirmed"
        ):
            missing.append("confirmation")
        return missing

    def _format_recent_messages_for_decision(self, recent_chat_messages: list[dict]) -> str:
        if not recent_chat_messages:
            return "no recent chat"
        return "\n".join(
            f"{entry.get('user_name') or entry.get('user_id')}: {entry['text']}" for entry in recent_chat_messages[-10:]
        )

    async def _format_catalog_context(self, text: str) -> str:
        lines: list[str] = ["catalog note: treat SKU-level hits as hints, not confirmed specs"]
        for segment in self._extract_material_segments(text)[:6]:
            match = await self._match_material(segment)
            if match is not None:
                lines.append(f"segment hint: '{segment}' looks like a known material mention")
            elif self._looks_like_material_segment(segment):
                lines.append(f"segment hint: '{segment}' looks like a manual free-text item candidate")
        alias_hits = await self.storage.find_alias_matches(text)
        for alias_hit in alias_hits[:5]:
            family = await self.storage.get_family(alias_hit["family_id"]) if alias_hit.get("family_id") else None
            variant = await self.storage.get_variant(alias_hit["variant_id"]) if alias_hit.get("variant_id") else None
            sku = await self.storage.get_sku(alias_hit["sku_id"]) if alias_hit.get("sku_id") else None
            target = (
                sku["title"]
                if sku
                else (variant["display_name"] if variant else (family["canonical_name"] if family else "unknown"))
            )
            lines.append(f"alias: {alias_hit['alias']} -> {target}")
        results = await self.storage.search_catalog(text)
        lines.extend(f"{result['type']}: {result['title']}" for result in results[:8])
        if not lines:
            return "no direct catalog hits"
        return "\n".join(lines)

    async def _resolve_item_target(self, draft_id: int, action: dict) -> dict | None:
        items = await self.storage.list_request_items(draft_id)
        target_index = action.get("target_item_index")
        if isinstance(target_index, int) and 1 <= target_index <= len(items):
            return items[target_index - 1]
        target_match = normalize_text(str(action.get("target_item_match") or ""))
        if not target_match:
            return None
        for item in items:
            haystack = " ".join(
                filter(
                    None,
                    [
                        str(item.get("raw_name") or ""),
                        str(item.get("normalized_name") or ""),
                        str(item.get("family_name") or ""),
                        str(item.get("variant_name") or ""),
                        str(item.get("sku_title") or ""),
                    ],
                )
            )
            if target_match in normalize_text(haystack):
                return item
        return None

    async def _resolve_catalog_entities(self, payload: dict) -> tuple[int | None, int | None, int | None]:
        family_id = None
        variant_id = None
        sku_id = None

        family_hint = str(payload.get("catalog_family") or "").strip()
        variant_hint = str(payload.get("catalog_variant") or "").strip()
        search_hint = family_hint or variant_hint or str(payload.get("normalized_name") or "").strip()
        if search_hint:
            results = await self.storage.search_catalog(search_hint)
            for result in results:
                if result["type"] == "family":
                    family_id = result["id"]
                    break
                if result["type"] == "variant":
                    variant = await self.storage.get_variant(result["id"])
                    if variant is not None:
                        family_id = variant["family_id"]
                        variant_id = variant["id"]
                        break
                if result["type"] == "sku":
                    sku = await self.storage.get_sku(result["id"])
                    if sku is not None:
                        family_id = sku["family_id"]
                        variant_id = sku.get("variant_id")
                        sku_id = sku["id"]
                        break

        if family_id and variant_hint:
            variants = await self.storage.list_variants(family_id)
            variant_normalized = normalize_text(variant_hint)
            for variant in variants:
                if variant_normalized == normalize_text(
                    variant["display_name"]
                ) or variant_normalized in normalize_text(variant["display_name"]):
                    variant_id = variant["id"]
                    break

        return family_id, variant_id, sku_id

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
