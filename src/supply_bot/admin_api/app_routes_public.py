from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request


def _resolve_public_lead_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    forwarded_ip = forwarded_for.split(",", maxsplit=1)[0].strip()
    if forwarded_ip:
        return forwarded_ip
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


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

        return {"ok": True}

    create_public_lead.__annotations__["payload"] = public_lead_payload_model
    app.post("/api/public/leads")(create_public_lead)
