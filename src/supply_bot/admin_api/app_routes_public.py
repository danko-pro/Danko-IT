from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request

from supply_bot.admin_api.calculator_routes.shared import (
    get_global_estimate_catalog_storage,
    get_plumbing_catalog_storage,
)
from supply_bot.admin_api.public_lead_notifications import PublicLeadTelegramNotifier
from supply_bot.domain.public_leads import (
    PUBLIC_LEAD_TELEGRAM_FAILED,
    PUBLIC_LEAD_TELEGRAM_SENT,
    PUBLIC_LEAD_TELEGRAM_SKIPPED,
)
from supply_bot.estimates.application.flooring_snapshot import BuildFlooringSnapshotUseCase
from supply_bot.estimates.application.plumbing_snapshot import BuildPlumbingSnapshotUseCase
from supply_bot.estimates.application.warm_floor_snapshot import BuildWarmFloorSnapshotUseCase


def _resolve_public_lead_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    forwarded_ip = forwarded_for.split(",", maxsplit=1)[0].strip()
    if forwarded_ip:
        return forwarded_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _resolve_public_lead_notifier(request: Request):
    notifier = getattr(request.app.state, "public_lead_notifier", None)
    if notifier is not None:
        return notifier

    settings = request.app.state.settings
    notifier = PublicLeadTelegramNotifier.from_settings(settings)
    request.app.state.public_lead_notifier = notifier
    return notifier


def _resolve_public_lead_repository(request: Request):
    return request.app.state.public_lead_repository


def register_public_routes(
    app: FastAPI,
    *,
    public_lead_payload_model,
) -> None:
    async def create_public_lead(request: Request, payload) -> dict[str, bool]:
        if payload.website.strip():
            raise HTTPException(status_code=422, detail="Invalid public lead payload")

        limiter = getattr(request.app.state, "public_lead_rate_limiter", None)
        if limiter is not None:
            decision = limiter.check(_resolve_public_lead_client_ip(request))
            if not decision.allowed:
                headers: dict[str, str] = {}
                if decision.retry_after_seconds is not None:
                    headers["Retry-After"] = str(decision.retry_after_seconds)
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests",
                    headers=headers,
                )

        lead_id = await _resolve_public_lead_repository(request).create_from_payload(payload)
        delivery_status = PUBLIC_LEAD_TELEGRAM_FAILED
        try:
            delivered = await _resolve_public_lead_notifier(request).notify(payload)
            delivery_status = PUBLIC_LEAD_TELEGRAM_SENT if delivered else PUBLIC_LEAD_TELEGRAM_SKIPPED
        except Exception:
            delivery_status = PUBLIC_LEAD_TELEGRAM_FAILED

        try:
            await _resolve_public_lead_repository(request).mark_telegram_delivery(
                lead_id,
                status=delivery_status,
            )
        except Exception:
            pass

        return {"ok": True}

    create_public_lead.__annotations__["payload"] = public_lead_payload_model
    app.post("/api/public/leads")(create_public_lead)


def register_public_catalog_routes(app: FastAPI) -> None:
    """Публичный read-only снапшот каталога сантехники (A7.1).

    Источник правды — глобальный каталог (owner_user_id = NULL, Слой 0): тот же,
    что правит админка. Отдаётся ТОЛЬКО публичный whitelist-payload: итоги с уже
    запечённым резервом, без internal-полей (riskPercent, разбивка цен, coefficient,
    source, note, technical_title). Эндпоинт публичный (см. PUBLIC_ADMIN_API_PATHS),
    но с rate-limit как у /api/public/leads — дёргается на сборке генератором (A7.2).
    """

    def check_snapshot_rate_limit(request: Request) -> None:
        limiter = getattr(request.app.state, "public_snapshot_rate_limiter", None)
        if limiter is not None:
            decision = limiter.check(_resolve_public_lead_client_ip(request))
            if not decision.allowed:
                headers: dict[str, str] = {}
                if decision.retry_after_seconds is not None:
                    headers["Retry-After"] = str(decision.retry_after_seconds)
                raise HTTPException(status_code=429, detail="Too many requests", headers=headers)

    @app.get("/api/public/catalog/plumbing/snapshot")
    async def public_plumbing_snapshot(request: Request) -> dict[str, Any]:
        check_snapshot_rate_limit(request)
        storage_obj = get_plumbing_catalog_storage(request)
        return await BuildPlumbingSnapshotUseCase(storage_obj).build_public()

    @app.get("/api/public/catalog/warm-floor/snapshot")
    async def public_warm_floor_snapshot(request: Request) -> dict[str, Any]:
        check_snapshot_rate_limit(request)
        storage_obj = get_global_estimate_catalog_storage(request)
        return await BuildWarmFloorSnapshotUseCase(storage_obj).build_public()

    @app.get("/api/public/catalog/flooring/snapshot")
    async def public_flooring_snapshot(request: Request) -> dict[str, Any]:
        check_snapshot_rate_limit(request)
        storage_obj = get_global_estimate_catalog_storage(request)
        return await BuildFlooringSnapshotUseCase(storage_obj).build_public()
