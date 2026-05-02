from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any


class DialogueRequestFlowDeliveryMixin:
    async def _handle_delivery_message(self, profile: dict, draft: dict, text: str) -> str | None:
        parsed = self._parse_delivery(text)
        if parsed is None:
            return None

        requested_date, requested_time = parsed
        if requested_date is None:
            base_reply = "Подскажите, пожалуйста, на какой день нужна доставка."
            return await self._narrate(base_reply, profile, draft)
        if requested_time is None:
            base_reply = "Принял день. Теперь подскажите точное время доставки."
            return await self._narrate(base_reply, profile, draft)

        await self.storage.update_draft_delivery(
            draft["id"],
            requested_date=requested_date.isoformat(),
            requested_time=requested_time.strftime("%H:%M"),
        )
        return await self._validate_and_finalize_delivery(profile, draft["id"], requested_date, requested_time)

    async def _validate_and_finalize_delivery(
        self, profile: dict, draft_id: int, requested_date: date, requested_time
    ) -> str:
        start_time = datetime.strptime(profile["delivery_start"], "%H:%M").time()
        end_time = datetime.strptime(profile["delivery_end"], "%H:%M").time()
        fallback_time = datetime.strptime(profile["delivery_fallback"], "%H:%M").time()
        now_dt = self._now()
        requested_dt = self._local_datetime(requested_date, requested_time)

        if requested_dt <= now_dt:
            proposed_date, proposed_time = self._next_available_delivery_slot(
                requested_date=requested_date,
                start_time=start_time,
                end_time=end_time,
                fallback_time=fallback_time,
                now_dt=now_dt,
            )
            await self.storage.update_draft_waiting(
                draft_id,
                waiting_for="delivery_proposal",
                proposed_delivery_date=proposed_date.isoformat(),
                proposed_delivery_time=proposed_time.strftime("%H:%M"),
                status="collecting",
            )
            requested_date = proposed_date
            base_reply = (
                f"Это время уже прошло. Могу поставить на {proposed_date.strftime('%d.%m.%Y')} "
                f"к {proposed_time.strftime('%H:%M')}. Подходит?"
            )
            return await self._narrate(base_reply, profile, {"id": draft_id})

        if requested_time < start_time or requested_time > end_time:
            proposed_date, proposed_time = self._next_available_delivery_slot(
                requested_date=requested_date,
                start_time=start_time,
                end_time=end_time,
                fallback_time=fallback_time,
                now_dt=now_dt,
            )
            await self.storage.update_draft_waiting(
                draft_id,
                waiting_for="delivery_proposal",
                proposed_delivery_date=proposed_date.isoformat(),
                proposed_delivery_time=proposed_time.strftime("%H:%M"),
                status="collecting",
            )
            base_reply = (
                f"В это время доставка не работает. Могу поставить на {requested_date.strftime('%d.%m.%Y')} "
                f"к {proposed_time.strftime('%H:%M')}. Подходит?"
            )
            return await self._narrate(base_reply, profile, {"id": draft_id})

        await self.storage.update_draft_delivery(
            draft_id,
            confirmed_date=requested_date.isoformat(),
            confirmed_time=requested_time.strftime("%H:%M"),
            status="awaiting_confirmation",
        )
        await self.storage.update_draft_waiting(draft_id, waiting_for="confirmation")
        draft = await self.storage.get_draft(draft_id)
        summary = await self._build_summary(draft, profile)
        return await self._narrate(summary, profile, draft)

    def _next_available_delivery_slot(
        self,
        *,
        requested_date: date,
        start_time,
        end_time,
        fallback_time,
        now_dt: datetime,
    ) -> tuple[date, Any]:
        preferred_time = fallback_time
        if preferred_time < start_time or preferred_time > end_time:
            preferred_time = start_time

        candidate_date = requested_date if requested_date >= now_dt.date() else now_dt.date()
        candidate_dt = self._local_datetime(candidate_date, preferred_time)
        if candidate_dt > now_dt:
            return candidate_date, preferred_time

        if candidate_date == now_dt.date() and start_time > now_dt.time():
            same_day_start = self._local_datetime(candidate_date, start_time)
            if same_day_start > now_dt:
                return candidate_date, start_time

        return candidate_date + timedelta(days=1), preferred_time
