from __future__ import annotations

from aiogram import Bot

from supply_bot.utils import format_date

class DialogueRequestFlowSummaryMixin:
    async def _build_summary(self, draft: dict, profile: dict, *, use_proposed: bool = False) -> str:
        items = await self.storage.list_request_items(draft["id"])
        lines = []
        for index, item in enumerate(items, start=1):
            lines.append(f"{index}. {self._format_item(item)}")

        delivery_date = draft.get("confirmed_delivery_date")
        delivery_time = draft.get("confirmed_delivery_time")
        if use_proposed:
            delivery_date = draft.get("proposed_delivery_date")
            delivery_time = draft.get("proposed_delivery_time")

        summary = [
            "Проверьте, пожалуйста, заявку:",
            f"Объект: {profile.get('object_name') or profile.get('title')}",
        ]
        if profile.get("address"):
            summary.append(f"Адрес: {profile['address']}")
        summary.append("Позиции:")
        summary.extend(lines or ["1. Позиции пока не добавлены"])
        summary.append(f"Доставка: {format_date(delivery_date)} к {delivery_time or 'не указано'}")
        summary.append("Если всё верно, напишите 'подтверждаю'.")
        return "\n".join(summary)

    async def _notify_admins(self, bot: Bot, summary: str, draft: dict) -> None:
        header = f"Новая подтверждённая заявка\nМастер: {draft['master_name']}\nЧерновик: #{draft['id']}\n\n"
        for admin_id in self.settings.admin_ids:
            await bot.send_message(admin_id, header + summary)
