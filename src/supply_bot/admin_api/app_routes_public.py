from __future__ import annotations

from fastapi import FastAPI


def register_public_routes(
    app: FastAPI,
    *,
    public_lead_payload_model,
) -> None:
    async def create_public_lead(payload) -> dict[str, bool]:
        return {"ok": True}

    create_public_lead.__annotations__["payload"] = public_lead_payload_model
    app.post("/api/public/leads")(create_public_lead)
