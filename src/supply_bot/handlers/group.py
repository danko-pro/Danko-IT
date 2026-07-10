"""Telegram-обработчики групповых чатов.

Роутер принимает групповые текстовые и голосовые сообщения и передает их в сервисный слой.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import Awaitable
from typing import TypeVar

from aiogram import F, Router
from aiogram.enums import ChatAction, ChatType
from aiogram.filters import Command
from aiogram.types import Message

from supply_bot.services.dialogue import RequestDialogueService
from supply_bot.services.media_intake import TelegramMediaIntakeService
from supply_bot.utils import normalize_text

TRANSCRIPT_PREVIEW_LIMIT = 180
TEXT_PREVIEW_LIMIT = 240
DIAGNOSTIC_REPLY_LIMIT = 3500
CHAT_ACTION_INTERVAL_SECONDS = 4.0

logger = logging.getLogger(__name__)
_T = TypeVar("_T")


def build_group_router(
    dialogue: RequestDialogueService,
    *,
    media_intake: TelegramMediaIntakeService | None = None,
) -> Router:
    """Собирает group-router для текстовых и голосовых сообщений."""
    router = Router(name="group")
    router.message.filter(F.chat.type.in_({ChatType.GROUP, ChatType.SUPERGROUP}))

    @router.message(Command("ping"))
    async def ping(message: Message) -> None:
        """Отвечает на техническую проверку доступности бота."""
        await message.answer("Бот на связи.")

    @router.message(Command("diag_request"))
    async def diag_request(message: Message) -> None:
        """Показывает диагностику распознавания заявки без создания черновика."""
        if message.from_user is None or message.from_user.is_bot:
            return
        payload = _extract_command_payload(message.text or "")
        if not payload:
            await message.reply("Пришлите текст после команды: /diag_request бот заявка кабель 150 м.п.")
            return
        await message.reply(_build_group_request_diagnostics(dialogue, payload))

    @router.message(F.text)
    async def handle_group_text(message: Message) -> None:
        """Передает текстовое сообщение в основной dialogue service."""
        if message.from_user is None or message.from_user.is_bot:
            return
        text_preview = _format_text_preview(message.text or "")
        logger.info(
            "group text received chat_id=%s user_id=%s message_id=%s text=%r",
            message.chat.id,
            message.from_user.id,
            message.message_id,
            text_preview,
        )
        logger.info(
            "group text dispatching chat_id=%s message_id=%s handler=dialogue.handle_group_message",
            message.chat.id,
            message.message_id,
        )
        result = await _run_with_typing(message, dialogue.handle_group_message(message.bot, message))
        logger.info(
            "group text handled chat_id=%s message_id=%s has_reply=%s reply=%r",
            message.chat.id,
            message.message_id,
            bool(result.text),
            _format_text_preview(result.text or "") if result.text else "",
        )
        if result.text:
            sent = await message.reply(result.text)
            await dialogue.remember_bot_reply(
                chat_id=message.chat.id,
                text=result.text,
                message_id=sent.message_id,
            )

    @router.message(F.voice | F.audio)
    async def handle_group_audio(message: Message) -> None:
        """Транскрибирует voice/audio и передает результат в основной dialogue service."""
        if message.from_user is None or message.from_user.is_bot or media_intake is None:
            return
        media_result = await _run_with_typing(
            message,
            media_intake.transcribe_group_audio_message(message.bot, message),
        )
        if not media_result.text:
            if media_result.reason:
                await message.reply(f"Не смог распознать голосовое: {media_result.reason}.")
            return
        result = await _run_with_typing(
            message,
            dialogue.handle_group_text_payload(
                message.bot,
                message,
                text=media_result.text,
                force_dialogue=True,
            ),
        )
        if result.text:
            sent = await message.reply(result.text)
            await dialogue.remember_bot_reply(
                chat_id=message.chat.id,
                text=result.text,
                message_id=sent.message_id,
            )
            return

        transcript_preview = _format_transcript_preview(media_result.text)
        await message.reply(
            f"Голосовое распознал: «{transcript_preview}».\n"
            "Но не смог собрать заявку. Скажи материал, количество и куда доставить."
        )

    return router


def _format_transcript_preview(text: str) -> str:
    """Обрезает transcript для диагностического ответа в чат."""
    return _format_text_preview(text, limit=TRANSCRIPT_PREVIEW_LIMIT)


def _format_text_preview(text: str, *, limit: int = TEXT_PREVIEW_LIMIT) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}…"


def _extract_command_payload(text: str) -> str:
    parts = text.strip().split(maxsplit=1)
    if len(parts) < 2:
        return ""
    return parts[1].strip()


def _build_group_request_diagnostics(dialogue: RequestDialogueService, text: str) -> str:
    normalized = normalize_text(text)
    quantity, unit = dialogue._extract_quantity(text)
    segments = dialogue._extract_material_segments(text)

    lines = [
        "Диагностика заявки:",
        f"normalized={_format_text_preview(normalized)}",
        f"addressed={str(dialogue._is_addressed_to_bot(text)).lower()}",
        f"score={dialogue._request_topic_score(text)}",
        f"quantity={quantity if quantity is not None else '-'}",
        f"unit={unit or '-'}",
        "segments:",
    ]
    if not segments:
        lines.append("- нет")
    for index, segment in enumerate(segments[:10], start=1):
        lines.append(f"{index}. {_format_text_preview(segment, limit=160)}")
        lines.append(f"   looks_like_material_segment={str(dialogue._looks_like_material_segment(segment)).lower()}")
    if len(segments) > 10:
        lines.append(f"... ещё {len(segments) - 10}")

    reply = "\n".join(lines)
    if len(reply) <= DIAGNOSTIC_REPLY_LIMIT:
        return reply
    return f"{reply[: DIAGNOSTIC_REPLY_LIMIT - 1].rstrip()}…"


async def _run_with_typing(message: Message, awaitable: Awaitable[_T]) -> _T:
    """Показывает Telegram typing action, пока идет долгая операция."""
    stop_event = asyncio.Event()
    typing_task = asyncio.create_task(_typing_loop(message, stop_event))
    try:
        return await awaitable
    finally:
        stop_event.set()
        typing_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await typing_task


async def _typing_loop(message: Message, stop_event: asyncio.Event) -> None:
    """Периодически отправляет chat action и не роняет обработчик при сетевом сбое Telegram."""
    while not stop_event.is_set():
        try:
            await message.bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)
        except Exception:
            logger.debug("Не удалось отправить Telegram typing action.", exc_info=True)
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=CHAT_ACTION_INTERVAL_SECONDS)
        except TimeoutError:
            continue
