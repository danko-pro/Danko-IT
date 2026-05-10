"""Telegram-обработчики групповых чатов.

Роутер принимает групповые текстовые и голосовые сообщения и передает их в сервисный слой.
"""

from __future__ import annotations

from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.filters import Command
from aiogram.types import Message

from supply_bot.services.dialogue import RequestDialogueService
from supply_bot.services.media_intake import TelegramMediaIntakeService


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

    @router.message(F.text)
    async def handle_group_text(message: Message) -> None:
        """Передает текстовое сообщение в основной dialogue service."""
        if message.from_user is None or message.from_user.is_bot:
            return
        result = await dialogue.handle_group_message(message.bot, message)
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
        media_result = await media_intake.transcribe_group_audio_message(message.bot, message)
        if not media_result.text:
            return
        result = await dialogue.handle_group_text_payload(message.bot, message, text=media_result.text)
        if result.text:
            sent = await message.reply(result.text)
            await dialogue.remember_bot_reply(
                chat_id=message.chat.id,
                text=result.text,
                message_id=sent.message_id,
            )

    return router
