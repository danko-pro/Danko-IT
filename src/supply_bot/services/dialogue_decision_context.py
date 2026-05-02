from __future__ import annotations

import re
from typing import Any

from supply_bot.constants import AFFIRMATIVE_WORDS, NEGATIVE_WORDS
from supply_bot.utils import normalize_text


class DialogueDecisionContextMixin:
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
