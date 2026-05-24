from __future__ import annotations

from pydantic import BaseModel, Field


class PublicLeadPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    phone: str = Field(..., min_length=1, max_length=120)
    objectType: str = Field(default="", max_length=120)
    area: str = Field(default="", max_length=40)
    packageType: str = Field(default="", max_length=160)
    contactMethod: str = Field(default="", max_length=40)
    comment: str = Field(default="", max_length=2000)
