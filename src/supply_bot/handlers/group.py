from __future__ import annotations

from aiogram import F, Router
from aiogram.enums import ChatType
from aiogram.filters import Command
from aiogram.types import Message

from supply_bot.services.dialogue import RequestDialogueService


def build_group_router(dialogue: RequestDialogueService) -> Router:
    router = Router(name="group")
    router.message.filter(F.chat.type.in_({ChatType.GROUP, ChatType.SUPERGROUP}))

    @router.message(Command("ping"))
    async def ping(message: Message) -> None:
        await message.answer("Бот на связи.")

    @router.message(F.text)
    async def handle_group_text(message: Message) -> None:
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

    return router
