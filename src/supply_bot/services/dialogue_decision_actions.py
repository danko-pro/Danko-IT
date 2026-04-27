from __future__ import annotations

from aiogram import Bot

class DialogueDecisionActionMixin:
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
