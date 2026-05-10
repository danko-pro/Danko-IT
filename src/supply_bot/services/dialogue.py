from __future__ import annotations

from aiogram import Bot
from aiogram.types import Message

from supply_bot.config import Settings
from supply_bot.services.dialogue_confirmation import DialogueConfirmationMixin
from supply_bot.services.dialogue_context import DialogueContextMixin
from supply_bot.services.dialogue_contract import DialogueResult
from supply_bot.services.dialogue_decision import DialogueDecisionMixin
from supply_bot.services.dialogue_materials import DialogueMaterialsMixin
from supply_bot.services.dialogue_narration import DialogueNarrationMixin
from supply_bot.services.dialogue_request_flow import DialogueRequestFlowMixin
from supply_bot.services.dialogue_support import DialogueSupportMixin
from supply_bot.services.llm import DialogueDecider, DialogueNarrator
from supply_bot.services.profiles import GroupProfileService
from supply_bot.storage import BotStorage
from supply_bot.utils import normalize_text


class RequestDialogueService(
    DialogueContextMixin,
    DialogueConfirmationMixin,
    DialogueRequestFlowMixin,
    DialogueMaterialsMixin,
    DialogueDecisionMixin,
    DialogueNarrationMixin,
    DialogueSupportMixin,
):
    def __init__(
        self,
        *,
        settings: Settings,
        storage: BotStorage,
        narrator: DialogueNarrator,
        profiles: GroupProfileService,
    ) -> None:
        self.settings = settings
        self.storage = storage
        self.narrator = narrator
        self.decider = DialogueDecider(settings)
        self.profiles = profiles

    async def remember_bot_reply(self, *, chat_id: int, text: str, message_id: int | None = None) -> None:
        if not text.strip():
            return
        await self.storage.add_group_message(
            chat_id=chat_id,
            user_id=0,
            user_name="bot",
            text=text,
            message_id=message_id,
        )

    async def handle_group_message(self, bot: Bot, message: Message) -> DialogueResult:
        """Обрабатывает обычное текстовое Telegram-сообщение из группы."""
        text = (message.text or "").strip()
        return await self.handle_group_text_payload(bot, message, text=text)

    async def handle_group_text_payload(
        self,
        bot: Bot,
        message: Message,
        *,
        text: str,
        force_dialogue: bool = False,
    ) -> DialogueResult:
        """Обрабатывает текстовый payload независимо от источника: сообщение или транскрипт.

        force_dialogue используется для voice/audio: пользователь уже явно отправил боту медиа,
        поэтому transcript нельзя отбрасывать тем же фильтром адресации, что фоновый текст чата.
        """
        text = text.strip()
        if not text or message.from_user is None:
            return DialogueResult(text=None)

        master_name = message.from_user.full_name or message.from_user.username or str(message.from_user.id)
        normalized = normalize_text(text)
        abort_requested = self._is_abort_request_message(text)
        abort_candidate = abort_requested or self._is_possible_abort_request_message(text)
        active_chat_draft = await self.storage.get_active_draft_for_chat(chat_id=message.chat.id)
        draft = active_chat_draft if active_chat_draft else None
        if active_chat_draft and int(active_chat_draft["master_id"]) != int(message.from_user.id):
            is_participant = await self.storage.is_draft_participant(
                draft_id=active_chat_draft["id"],
                user_id=message.from_user.id,
            )
            if abort_candidate and not is_participant:
                admin_ids = {int(admin_id) for admin_id in self.settings.admin_ids}
                if abort_requested and int(message.from_user.id) in admin_ids:
                    await self.storage.set_draft_status(active_chat_draft["id"], status="cancelled")
                    return DialogueResult(text="Понял, активную заявку в этом чате закрыл.")
                owner_name = str(active_chat_draft.get("master_name") or "другого мастера")
                return DialogueResult(
                    text=(
                        f"Сейчас в чате открыта заявка другого мастера: {owner_name}. "
                        "Отменить ее может автор заявки или администратор."
                    )
                )
            should_join_draft = self._should_join_active_draft(text)
            if not is_participant and not should_join_draft:
                return DialogueResult(text=None)
            if should_join_draft:
                await self.storage.add_draft_participant(
                    draft_id=active_chat_draft["id"],
                    user_id=message.from_user.id,
                    user_name=master_name,
                )
        elif active_chat_draft:
            await self.storage.add_draft_participant(
                draft_id=active_chat_draft["id"],
                user_id=message.from_user.id,
                user_name=master_name,
                role="owner",
            )

        if draft and not force_dialogue and not self._should_process_active_draft_message(text, draft):
            return DialogueResult(text=None)

        profile = await self.profiles.sync_from_telegram(bot, message.chat.id)
        await self.storage.add_group_message(
            chat_id=message.chat.id,
            user_id=message.from_user.id,
            user_name=master_name,
            text=text,
            message_id=message.message_id,
        )
        recent_self_messages = await self.storage.list_recent_group_messages(
            chat_id=message.chat.id,
            user_id=message.from_user.id,
            limit=6,
        )
        recent_chat_messages = await self.storage.list_recent_group_messages(
            chat_id=message.chat.id,
            limit=12,
        )
        if draft is None:
            draft = await self.storage.get_active_draft(chat_id=message.chat.id, master_id=message.from_user.id)
        explicit_cancel_without_draft = abort_requested and (
            force_dialogue
            or self._is_addressed_to_bot(text)
            or "заявк" in normalized
            or "заказ" in normalized
            or "чернов" in normalized
        )

        if draft is None and explicit_cancel_without_draft:
            return DialogueResult(text="Активной заявки для отмены не нашел.")

        should_listen_without_address = self._should_listen_without_address(text)
        allow_unaddressed_unknown_material = should_listen_without_address and "заявк" in normalized
        if (
            draft is None
            and not force_dialogue
            and not self._is_addressed_to_bot(text)
            and not should_listen_without_address
        ):
            return DialogueResult(text=None)

        if draft and abort_requested:
            await self.storage.set_draft_status(draft["id"], status="cancelled")
            reply = (
                "Понял, это не рабочая заявка. Черновик закрыл. "
                "Если понадобится, просто напишите материал и количество одной фразой."
            )
            return DialogueResult(text=reply)

        llm_reply = await self._try_llm_decision(
            bot=bot,
            profile=profile,
            chat_id=message.chat.id,
            master_id=message.from_user.id,
            master_name=master_name,
            text=text,
            draft=draft,
            recent_chat_messages=recent_chat_messages,
            force_dialogue=force_dialogue,
        )
        if llm_reply is not None:
            return DialogueResult(text=llm_reply)

        if draft and abort_candidate:
            return DialogueResult(
                text=(
                    "Похоже, вы хотите остановить или отменить заявку. "
                    "Напишите 'отмена заявки', если закрываем черновик, или уточните, что именно нужно убрать."
                )
            )

        if draft:
            confirmation_result = await self._handle_confirmation(bot, profile, draft, text, normalized)
            if confirmation_result is not None:
                return confirmation_result

            waiting_result = await self._handle_waiting_state(profile, draft, text)
            if waiting_result is not None:
                return waiting_result

        material_matches, unknown_segments = await self._analyze_material_mentions(text)
        if material_matches:
            quantity, _ = self._extract_quantity(text)
            if draft is None and not (
                force_dialogue
                or self._should_start_new_request_message(text)
                or quantity is not None
                or self._is_addressed_to_bot(text)
                or should_listen_without_address
            ):
                return DialogueResult(text=None)
            draft = await self.storage.get_or_create_active_draft(
                chat_id=message.chat.id,
                master_id=message.from_user.id,
                master_name=master_name,
            )
            reply = await self._handle_material_matches(profile, draft, text, material_matches, unknown_segments)
            return DialogueResult(text=reply)

        if unknown_segments and not draft:
            if self._is_smalltalk_message(text):
                return DialogueResult(text=None)
            if (
                not force_dialogue
                and not self._is_request_opening_text(text, unknown_segments)
                and not self._should_start_new_request_message(text)
                and not allow_unaddressed_unknown_material
            ):
                return DialogueResult(text=None)
            draft = await self.storage.get_or_create_active_draft(
                chat_id=message.chat.id,
                master_id=message.from_user.id,
                master_name=master_name,
            )
            if self._is_request_opening_text(text, unknown_segments):
                base_reply = (
                    "Принял. Что именно нужно привезти? Напишите материал одной фразой, можно сразу с количеством."
                )
                return DialogueResult(text=await self._narrate(base_reply, profile, draft))
            reply = await self._reply_for_unknown_segments(profile, draft, unknown_segments, text)
            return DialogueResult(text=reply)

        if draft:
            delivery_reply = await self._handle_delivery_message(profile, draft, text)
            if delivery_reply is not None:
                return DialogueResult(text=delivery_reply)

            if unknown_segments:
                reply = await self._reply_for_unknown_segments(profile, draft, unknown_segments, text)
                return DialogueResult(text=reply)

            unknown_terms = unknown_segments or [text[:120]]
            for raw_term in unknown_terms:
                await self.storage.add_unknown_term(
                    raw_term=raw_term,
                    full_message=text,
                    chat_id=message.chat.id,
                    message_id=message.message_id,
                )
            base_reply = (
                "Пока не до конца понял позицию. Напишите, пожалуйста, материал чуть точнее, "
                "как его потом надо указать в заявке."
            )
            return DialogueResult(text=await self._narrate(base_reply, profile, draft))

        if not draft:
            contextual_reply = await self._handle_contextual_start(
                profile=profile,
                chat_id=message.chat.id,
                master_id=message.from_user.id,
                master_name=master_name,
                text=text,
                recent_self_messages=recent_self_messages,
                recent_chat_messages=recent_chat_messages,
            )
            if contextual_reply is not None:
                return DialogueResult(text=contextual_reply)

        return DialogueResult(text=None)
