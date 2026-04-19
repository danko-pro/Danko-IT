"""Схемы авторизации admin API."""

from pydantic import BaseModel


class AdminLoginPayload(BaseModel):
    password: str
