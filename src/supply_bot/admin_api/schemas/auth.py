"""Схемы авторизации admin API."""

from pydantic import BaseModel


class AdminLoginPayload(BaseModel):
    email: str | None = None
    password: str


class UserRegisterPayload(BaseModel):
    email: str
    password: str
    display_name: str | None = None
