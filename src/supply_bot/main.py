from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeAllPrivateChats

from supply_bot.config import load_settings
from supply_bot.handlers.admin import build_admin_router
from supply_bot.handlers.group import build_group_router
from supply_bot.services.dialogue import RequestDialogueService
from supply_bot.services.llm import DialogueNarrator
from supply_bot.services.media_intake import TelegramMediaIntakeService
from supply_bot.services.profiles import GroupProfileService
from supply_bot.storage import BotStorage


async def run() -> None:
    settings = load_settings()
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    storage = BotStorage(settings.database_path)
    await storage.initialize()
    await storage.ensure_runtime_settings(
        delivery_start=settings.default_delivery_start.strftime("%H:%M"),
        delivery_end=settings.default_delivery_end.strftime("%H:%M"),
        delivery_fallback=settings.default_delivery_fallback.strftime("%H:%M"),
    )

    narrator = DialogueNarrator(settings)
    media_intake = TelegramMediaIntakeService(settings)
    profiles = GroupProfileService(storage, settings)
    dialogue = RequestDialogueService(
        settings=settings,
        storage=storage,
        narrator=narrator,
        profiles=profiles,
    )

    bot = Bot(settings.bot_token)
    dispatcher = Dispatcher(storage=MemoryStorage())
    dispatcher.include_router(build_admin_router(settings, storage))
    dispatcher.include_router(build_group_router(dialogue, media_intake=media_intake))

    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Открыть главное меню"),
            BotCommand(command="admin", description="Панель администратора"),
            BotCommand(command="ping", description="Проверить, что бот на связи"),
        ],
        scope=BotCommandScopeAllPrivateChats(),
    )
    await bot.delete_webhook(drop_pending_updates=True)
    await dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types())


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
