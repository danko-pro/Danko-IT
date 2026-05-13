from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeAllPrivateChats

from supply_bot.config import load_settings
from supply_bot.database import create_database_runtime
from supply_bot.database.metadata import metadata
from supply_bot.handlers.admin import build_admin_router
from supply_bot.handlers.group import build_group_router
from supply_bot.services.dialogue import RequestDialogueService
from supply_bot.services.llm import DialogueNarrator
from supply_bot.services.media_intake import TelegramMediaIntakeService
from supply_bot.services.profiles import GroupProfileService
from supply_bot.storage import BotStorage
from supply_bot.storage.delegating import DomainDelegatingStorage
from supply_bot.storage_catalog import SqlAlchemyCatalogRepository
from supply_bot.storage_notifications import SqlAlchemyTelegramNotificationRepository
from supply_bot.storage_requests import SqlAlchemyRequestRuntimeRepository


async def run() -> None:
    settings = load_settings()
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    legacy_storage = BotStorage(settings.database_path)
    database_runtime = create_database_runtime(settings)
    catalog_repository = SqlAlchemyCatalogRepository(database_runtime.session_factory)
    request_repository = SqlAlchemyRequestRuntimeRepository(database_runtime.session_factory)
    notification_repository = SqlAlchemyTelegramNotificationRepository(database_runtime.session_factory)
    storage = DomainDelegatingStorage(
        legacy_storage,
        catalog_storage=catalog_repository.for_owner(None),
        request_storage=request_repository.for_owner(None),
        notification_storage=notification_repository.for_owner(None),
    )
    if database_runtime.backend == "sqlite":
        await database_runtime.create_metadata(metadata)

    await storage.initialize()
    await storage.ensure_runtime_settings(
        delivery_start=settings.default_delivery_start.strftime("%H:%M"),
        delivery_end=settings.default_delivery_end.strftime("%H:%M"),
        delivery_fallback=settings.default_delivery_fallback.strftime("%H:%M"),
    )
    await storage.expire_stale_active_drafts(max_age_hours=settings.request_draft_stale_hours)

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

    try:
        await bot.set_my_commands(
            [
                BotCommand(command="start", description="РћС‚РєСЂС‹С‚СЊ РіР»Р°РІРЅРѕРµ РјРµРЅСЋ"),
                BotCommand(command="admin", description="РџР°РЅРµР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°"),
                BotCommand(command="ping", description="РџСЂРѕРІРµСЂРёС‚СЊ, С‡С‚Рѕ Р±РѕС‚ РЅР° СЃРІСЏР·Рё"),
            ],
            scope=BotCommandScopeAllPrivateChats(),
        )
        await bot.delete_webhook(drop_pending_updates=True)
        await dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types())
    finally:
        await database_runtime.dispose()


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
