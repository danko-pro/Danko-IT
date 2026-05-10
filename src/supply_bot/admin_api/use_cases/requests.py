from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from supply_bot.admin_api.app_helpers import (
    _admin_status_message,
    _request_detail_payload,
    _send_group_message,
)
from supply_bot.admin_api.app_routes_requests_support import (
    build_request_item_create_values,
    build_request_item_update_values,
    clamp_route_limit,
    normalize_request_delivery,
    normalize_request_status,
)


async def list_recent_requests(storage_obj, *, limit: int = 20) -> list[dict[str, Any]]:
    async with storage_obj.connection() as db:
        cursor = await db.execute(
            """
            SELECT
                rd.id,
                rd.chat_id,
                rd.master_id,
                rd.master_name,
                rd.status,
                rd.waiting_for,
                rd.updated_at,
                rd.confirmed_delivery_date,
                rd.confirmed_delivery_time,
                rd.requested_delivery_date,
                rd.requested_delivery_time,
                COALESCE(gp.object_name, gp.title, 'Без объекта') AS object_name,
                COUNT(ri.id) AS items_count
            FROM request_drafts rd
            LEFT JOIN group_profiles gp ON gp.chat_id = rd.chat_id
            LEFT JOIN request_items ri ON ri.draft_id = rd.id
            GROUP BY rd.id, rd.chat_id, rd.master_id, rd.master_name, rd.status, rd.waiting_for,
                     rd.updated_at, rd.confirmed_delivery_date, rd.confirmed_delivery_time,
                     rd.requested_delivery_date, rd.requested_delivery_time, gp.object_name, gp.title
            ORDER BY rd.updated_at DESC
            LIMIT ?
            """,
            (max(1, min(limit, 100)),),
        )
        rows = await cursor.fetchall()
    return [dict(row) for row in rows[: clamp_route_limit(limit)]]


async def expire_stale_requests(storage_obj, settings_obj, *, max_age_hours: int | None = None) -> dict[str, int]:
    resolved_max_age = settings_obj.request_draft_stale_hours if max_age_hours is None else max_age_hours
    if resolved_max_age < 0:
        raise HTTPException(status_code=400, detail="max_age_hours must be non-negative")

    expired_count = await storage_obj.expire_stale_active_drafts(max_age_hours=resolved_max_age)
    return {"expired_count": expired_count, "max_age_hours": resolved_max_age}


async def get_request_detail(storage_obj, draft_id: int) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return await _request_detail_payload(storage_obj, draft)


async def update_request_status(storage_obj, settings_obj, draft_id: int, status: str) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    target_status = normalize_request_status(status)

    await storage_obj.update_draft_admin_fields(
        draft_id,
        status=target_status,
        waiting_for="confirmation" if target_status == "confirmed" else None,
    )
    updated_draft = await storage_obj.get_draft(draft_id)
    if not updated_draft:
        raise HTTPException(status_code=500, detail="Draft status update failed")

    notification_error: str | None = None
    notified = False
    notification_text = _admin_status_message(target_status)
    if notification_text:
        try:
            await _send_group_message(
                settings=settings_obj,
                chat_id=int(updated_draft["chat_id"]),
                text=notification_text,
            )
            notified = True
        except Exception as exc:  # noqa: BLE001
            notification_error = str(exc)

    return {
        "draft_id": draft_id,
        "status": target_status,
        "notified": notified,
        "notification_error": notification_error,
    }


async def delete_request(storage_obj, draft_id: int) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft["status"] not in {"collecting", "awaiting_confirmation", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail="Only drafts, awaiting confirmation, or cancelled requests can be deleted",
        )

    await storage_obj.delete_draft(draft_id)
    return {"deleted": True, "draft_id": draft_id}


async def update_request_delivery(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    delivery_date, delivery_time = normalize_request_delivery(payload.delivery_date, payload.delivery_time)

    await storage_obj.replace_draft_delivery(
        draft_id,
        requested_date=delivery_date,
        requested_time=delivery_time,
        confirmed_date=delivery_date,
        confirmed_time=delivery_time,
        proposed_date=None,
        proposed_time=None,
        waiting_for="confirmation",
        status=draft["status"],
    )
    fresh = await storage_obj.get_draft(draft_id)
    if not fresh:
        raise HTTPException(status_code=500, detail="Draft delivery update failed")
    return await _request_detail_payload(storage_obj, fresh)


async def create_request_item(storage_obj, draft_id: int, payload) -> dict[str, Any]:
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    await storage_obj.create_request_item(draft_id=draft_id, **build_request_item_create_values(payload))
    await storage_obj.touch_draft(draft_id)
    fresh = await storage_obj.get_draft(draft_id)
    if not fresh:
        raise HTTPException(status_code=500, detail="Draft item creation failed")
    return await _request_detail_payload(storage_obj, fresh)


async def update_request_item(storage_obj, item_id: int, payload) -> dict[str, Any]:
    item = await storage_obj.get_request_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Request item not found")

    await storage_obj.update_request_item(item_id, **build_request_item_update_values(payload))
    await storage_obj.touch_draft(int(item["draft_id"]))
    draft = await storage_obj.get_draft(int(item["draft_id"]))
    if not draft:
        raise HTTPException(status_code=500, detail="Draft item update failed")
    return await _request_detail_payload(storage_obj, draft)


async def delete_request_item(storage_obj, item_id: int) -> dict[str, Any]:
    item = await storage_obj.get_request_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Request item not found")

    draft_id = int(item["draft_id"])
    await storage_obj.delete_request_item(item_id)
    await storage_obj.touch_draft(draft_id)
    draft = await storage_obj.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=500, detail="Draft item deletion failed")
    return await _request_detail_payload(storage_obj, draft)
