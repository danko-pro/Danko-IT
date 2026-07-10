from __future__ import annotations

from supply_bot.constants import AFFIRMATIVE_WORDS, CANCEL_WORDS, NEGATIVE_WORDS
from supply_bot.services.dialogue_materials import GENERIC_REQUEST_WORDS
from supply_bot.utils import normalize_text

BOT_ADDRESS_WORDS = {"бот", "danko_ai_bot", "danko", "данко", "данкоит"}
STRONG_REQUEST_MARKERS = (
    "заявк",
    "заказ",
    "закаж",
    "достав",
    "привез",
    "привезт",
    "завез",
    "оформ",
)
WEAK_REQUEST_MARKERS = (
    "нужен",
    "нужна",
    "нужно",
    "нужны",
    "надо",
    "добав",
    "забыл",
)
SUPPORT_REQUEST_MARKERS = (
    "посчит",
    "посчита",
    "подскажи",
    "помоги",
    "рассчит",
    "сколько",
)
ORDER_OPENING_MARKERS = (
    "привези",
    "привезите",
    "привезти",
    "завези",
    "завезите",
    "закажи",
    "заказать",
    "оформи заявк",
    "оформить заявк",
    "нужна заявк",
    "собери заявк",
    "сделай заявк",
)
ACTIVE_DRAFT_JOIN_REFERENCES = (
    "по заявк",
    "в заявк",
    "к заявк",
    "эту заявк",
    "туда же",
)
DIRECT_ABORT_REQUEST_MARKERS = (
    "отбой",
    "отмена заявк",
    "отмена заказ",
    "отмени заявк",
    "отменить заявк",
    "заявку отмен",
    "закрой заявк",
    "закрыть заявк",
    "удали заявк",
    "сброс заявк",
    "сбрось заявк",
    "аннулируй заявк",
    "аннулировать заявк",
    "снимаем заявк",
    "закрываем заявк",
    "это проверка",
    "просто провер",
    "ложная тревога",
)
EXACT_ABORT_REQUEST_PHRASES = (
    "пока не надо",
    "не надо",
    "не нужна заявка",
    "не нужен заказ",
    "не нужно оформлять",
)
POSSIBLE_ABORT_REQUEST_MARKERS = (
    "передумал",
    "не оформляй",
    "не оформляем",
    "не отправляй",
    "не отправляем",
    "не вези",
    "не привози",
    "пока не вези",
    "пока не привози",
    "на паузу",
    "поставь на паузу",
    "снимаем",
    "закрываем",
    "аннулируй",
    "отменяем",
)
CONTEXT_CONTINUATION_MARKERS = (
    "и ",
    "еще",
    "ещё",
    "туда же",
    "по заявке",
    "по материал",
    "по этому",
    "по этой",
)
SMALLTALK_MARKERS = (
    "привет",
    "здравств",
    "доброе утро",
    "добрый день",
    "добрый вечер",
    "спасибо",
    "благодарю",
    "как дела",
)
SIDE_CHAT_QUESTION_STARTS = (
    "кто",
    "где",
    "куда",
    "почему",
    "зачем",
    "как",
    "что",
    "когда",
)


class DialogueContextMixin:
    def _is_addressed_to_bot(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized:
            return False
        first_word = normalized.split(maxsplit=1)[0].strip("@,:;.!?")
        return first_word in BOT_ADDRESS_WORDS

    def _is_abort_request_message(self, text: str) -> bool:
        normalized = normalize_text(text)
        if normalized in CANCEL_WORDS:
            return True
        if normalized in EXACT_ABORT_REQUEST_PHRASES:
            return True
        return any(marker in normalized for marker in DIRECT_ABORT_REQUEST_MARKERS)

    def _is_possible_abort_request_message(self, text: str) -> bool:
        normalized = normalize_text(text)
        if self._is_abort_request_message(text):
            return True
        return any(marker in normalized for marker in POSSIBLE_ABORT_REQUEST_MARKERS)

    def _should_listen_without_address(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized or self._is_smalltalk_message(text):
            return False
        if "заявк" in normalized:
            return any(marker in normalized for marker in ORDER_OPENING_MARKERS)
        quantity, unit = self._extract_quantity(text)
        if quantity is None or unit is None:
            return False
        return any(marker in normalized for marker in ORDER_OPENING_MARKERS)

    def _should_join_active_draft(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized or self._is_smalltalk_message(text):
            return False
        if self._is_addressed_to_bot(text):
            return (
                self._is_possible_abort_request_message(text)
                or self._request_topic_score(text) >= 2
                or any(marker in normalized for marker in ACTIVE_DRAFT_JOIN_REFERENCES)
            )
        quantity, unit = self._extract_quantity(text)
        has_request_reference = any(marker in normalized for marker in ACTIVE_DRAFT_JOIN_REFERENCES)
        if has_request_reference:
            return unit is not None or any(marker in normalized for marker in ("добав", "нуж", "привез", "заявк"))
        return normalized.startswith(("еще ", "ещё ", "и ")) and unit is not None

    def _should_process_active_draft_message(self, text: str, draft: dict) -> bool:
        normalized = normalize_text(text)
        if not normalized or self._is_smalltalk_message(text):
            return False
        if self._is_abort_request_message(text) or self._is_possible_abort_request_message(text):
            return True
        if self._looks_like_waiting_answer(text, draft):
            return True
        if self._looks_like_delivery_answer(text) and self._draft_needs_delivery(draft):
            return True
        if self._is_addressed_to_bot(text):
            return self._request_topic_score(text) >= 2 or any(
                marker in normalized for marker in ACTIVE_DRAFT_JOIN_REFERENCES
            )
        return self._request_topic_score(text) >= 2 and (
            self._has_additional_material_intent(text)
            or any(marker in normalized for marker in ACTIVE_DRAFT_JOIN_REFERENCES)
        )

    def _looks_like_waiting_answer(self, text: str, draft: dict) -> bool:
        waiting_for = str(draft.get("waiting_for") or "")
        normalized = normalize_text(text)
        if not waiting_for:
            return False
        if waiting_for == "confirmation":
            return normalized in AFFIRMATIVE_WORDS or normalized in NEGATIVE_WORDS
        if waiting_for == "delivery_proposal":
            return (
                normalized in AFFIRMATIVE_WORDS
                or normalized in NEGATIVE_WORDS
                or self._looks_like_delivery_answer(text)
            )
        if waiting_for == "variant":
            return self._extract_variant_hint(normalized) is not None
        if waiting_for == "thickness_mm":
            return self._extract_thickness(text) is not None
        if waiting_for == "size":
            return self._extract_size(text) is not None
        if waiting_for == "quantity":
            quantity, unit = self._extract_quantity(text)
            return quantity is not None and (unit is not None or self._is_plain_number_answer(text))
        if waiting_for == "comment":
            return self._is_addressed_to_bot(text) or normalized in NEGATIVE_WORDS or "без коммент" in normalized
        if waiting_for == "manual_item_description":
            quantity, unit = self._extract_quantity(text)
            return unit is not None or self._looks_like_material_segment(text)
        return False

    def _looks_like_delivery_answer(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized or "?" in text:
            return False
        first_word = normalized.split(maxsplit=1)[0]
        if first_word in SIDE_CHAT_QUESTION_STARTS:
            return False
        return self._parse_delivery(text) is not None

    def _draft_needs_delivery(self, draft: dict) -> bool:
        return not (draft.get("confirmed_delivery_date") and draft.get("confirmed_delivery_time"))

    def _is_plain_number_answer(self, text: str) -> bool:
        normalized = normalize_text(text)
        return bool(normalized) and normalized.replace(".", "", 1).replace(",", "", 1).isdigit()

    def _should_start_new_request_message(self, text: str) -> bool:
        if not self._is_addressed_to_bot(text):
            return False
        normalized = normalize_text(text)
        if (
            not normalized
            or normalized in AFFIRMATIVE_WORDS
            or normalized in NEGATIVE_WORDS
            or normalized in CANCEL_WORDS
        ):
            return False
        if self._parse_delivery(text) is not None:
            return True
        if any(marker in normalized for marker in STRONG_REQUEST_MARKERS):
            return True
        if any(marker in normalized for marker in WEAK_REQUEST_MARKERS):
            return True
        if any(marker in normalized for marker in SUPPORT_REQUEST_MARKERS):
            return True
        return False

    def _request_topic_score(self, text: str) -> int:
        normalized = normalize_text(text)
        if (
            not normalized
            or normalized in AFFIRMATIVE_WORDS
            or normalized in NEGATIVE_WORDS
            or normalized in CANCEL_WORDS
        ):
            return 0

        score = 0
        if any(marker in normalized for marker in STRONG_REQUEST_MARKERS):
            score += 2
        if any(marker in normalized for marker in WEAK_REQUEST_MARKERS):
            score += 1
        if any(marker in normalized for marker in SUPPORT_REQUEST_MARKERS):
            score += 1
        if self._is_addressed_to_bot(text):
            score += 1
        if self._parse_delivery(text) is not None:
            score += 1
        quantity, _ = self._extract_quantity(text)
        if quantity is not None:
            score += 1

        cleaned = normalize_text(self._clean_manual_item_name(text))
        words = [word for word in cleaned.split() if word]
        if words and set(words).issubset(GENERIC_REQUEST_WORDS):
            score += 2
        if any(normalized.startswith(marker) or marker in normalized for marker in CONTEXT_CONTINUATION_MARKERS):
            score += 1
        return score

    def _is_request_opening_text(self, text: str, unknown_segments: list[str]) -> bool:
        if not self._is_addressed_to_bot(text):
            return False
        if self._is_generic_request_opening(unknown_segments):
            return True
        cleaned = normalize_text(self._clean_manual_item_name(text))
        if cleaned in {"оформить", "оформим", "собрать", "соберем", "соберём"}:
            return True
        score = self._request_topic_score(text)
        if score >= 2:
            return True
        return score >= 3

    def _is_smalltalk_message(self, text: str) -> bool:
        normalized = normalize_text(text)
        if not normalized:
            return False
        if self._request_topic_score(text) > 0:
            return False
        return any(marker in normalized for marker in SMALLTALK_MARKERS)

    def _is_context_continuation_message(self, text: str) -> bool:
        normalized = normalize_text(text)
        if (
            not normalized
            or normalized in AFFIRMATIVE_WORDS
            or normalized in NEGATIVE_WORDS
            or normalized in CANCEL_WORDS
        ):
            return False
        if self._parse_delivery(text) is not None:
            return True
        quantity, _ = self._extract_quantity(text)
        if quantity is not None:
            return True
        return any(normalized.startswith(marker) or marker in normalized for marker in CONTEXT_CONTINUATION_MARKERS)

    async def _handle_contextual_start(
        self,
        *,
        profile: dict,
        chat_id: int,
        master_id: int,
        master_name: str,
        text: str,
        recent_self_messages: list[dict],
        recent_chat_messages: list[dict],
    ) -> str | None:
        if not self._is_addressed_to_bot(text):
            return None
        current_score = self._request_topic_score(text)
        previous_self_messages = recent_self_messages[:-1]
        previous_chat_messages = recent_chat_messages[:-1]
        previous_self_score = sum(self._request_topic_score(entry["text"]) for entry in previous_self_messages[-3:])
        previous_chat_score = sum(self._request_topic_score(entry["text"]) for entry in previous_chat_messages[-5:])

        if self._is_context_continuation_message(text):
            restored = await self._restore_from_recent_context(
                profile=profile,
                chat_id=chat_id,
                master_id=master_id,
                master_name=master_name,
                text=text,
                recent_self_messages=previous_self_messages,
            )
            if restored is not None:
                return restored

        if current_score >= 2 or previous_self_score >= 3 or (previous_chat_score >= 5 and current_score >= 1):
            draft = await self.storage.get_or_create_active_draft(
                chat_id=chat_id,
                master_id=master_id,
                master_name=master_name,
            )
            base_reply = (
                "Вижу, что речь уже о заявке. Напишите, пожалуйста, что именно нужно привезти, "
                "одной фразой. Можно сразу с количеством."
            )
            return await self._narrate(base_reply, profile, draft)

        return None

    async def _restore_from_recent_context(
        self,
        *,
        profile: dict,
        chat_id: int,
        master_id: int,
        master_name: str,
        text: str,
        recent_self_messages: list[dict],
    ) -> str | None:
        for entry in reversed(recent_self_messages[-3:]):
            basis_text = entry["text"]
            matches, unknown_segments = await self._analyze_material_mentions(basis_text)
            if not matches and not unknown_segments:
                continue
            if unknown_segments and self._is_request_opening_text(basis_text, unknown_segments):
                continue
            combined_text = f"{basis_text}, {text}"
            combined_matches, combined_unknown_segments = await self._analyze_material_mentions(combined_text)
            draft = await self.storage.get_or_create_active_draft(
                chat_id=chat_id,
                master_id=master_id,
                master_name=master_name,
            )
            if combined_matches:
                return await self._handle_material_matches(
                    profile, draft, combined_text, combined_matches, combined_unknown_segments
                )
            if combined_unknown_segments:
                return await self._reply_for_unknown_segments(profile, draft, combined_unknown_segments, combined_text)
        return None
