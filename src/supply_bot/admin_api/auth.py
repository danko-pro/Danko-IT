from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from fastapi import Response

SESSION_COOKIE_NAME = "supply_admin_session"
PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"


@dataclass(frozen=True, slots=True)
class AdminSession:
    subject: str
    role: str
    expires_at: int
    user_id: int | None = None
    email: str | None = None
    display_name: str | None = None
    mode: str = "session"

    @property
    def expires_at_iso(self) -> str:
        return datetime.fromtimestamp(self.expires_at, tz=timezone.utc).isoformat()


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64url_decode(value: str) -> bytes | None:
    if not value:
        return None
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return None


def hash_admin_password(password: str, *, salt: str | None = None, iterations: int = 390000) -> str:
    normalized = password.strip()
    if not normalized:
        raise ValueError("Admin password cannot be empty")
    resolved_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        normalized.encode("utf-8"),
        resolved_salt.encode("utf-8"),
        iterations,
    )
    return f"{PASSWORD_HASH_ALGORITHM}${iterations}${resolved_salt}${digest.hex()}"


def verify_admin_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iterations_raw, salt, expected_digest = password_hash.split("$", maxsplit=3)
    except ValueError:
        return False

    if algorithm != PASSWORD_HASH_ALGORITHM:
        return False

    try:
        iterations = int(iterations_raw)
    except ValueError:
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.strip().encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()
    return hmac.compare_digest(candidate, expected_digest)


def create_admin_session_token(
    secret: str,
    *,
    ttl_seconds: int,
    subject: str = "admin",
    role: str = "admin",
    user_id: int | None = None,
    email: str | None = None,
    display_name: str | None = None,
) -> tuple[str, AdminSession]:
    expires_at = int(time.time()) + max(60, ttl_seconds)
    payload = {
        "sub": subject,
        "role": role,
        "exp": expires_at,
        "uid": user_id,
        "email": email,
        "name": display_name,
    }
    payload_token = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = hmac.new(secret.encode("utf-8"), payload_token.encode("utf-8"), hashlib.sha256).digest()
    signed_token = f"{payload_token}.{_b64url_encode(signature)}"
    return signed_token, AdminSession(
        subject=subject,
        role=role,
        expires_at=expires_at,
        user_id=user_id,
        email=email,
        display_name=display_name,
    )


def read_admin_session_token(token: str | None, secret: str | None) -> AdminSession | None:
    if not token or not secret:
        return None
    try:
        payload_token, signature_token = token.split(".", maxsplit=1)
    except ValueError:
        return None

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        payload_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    actual_signature = _b64url_decode(signature_token)
    if actual_signature is None or not hmac.compare_digest(actual_signature, expected_signature):
        return None

    payload_bytes = _b64url_decode(payload_token)
    if payload_bytes is None:
        return None

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None

    subject = payload.get("sub")
    role = payload.get("role")
    expires_at = payload.get("exp")
    user_id = payload.get("uid")
    email = payload.get("email")
    display_name = payload.get("name")
    if not isinstance(subject, str) or not isinstance(role, str) or not isinstance(expires_at, int):
        return None
    if user_id is not None and not isinstance(user_id, int):
        return None
    if email is not None and not isinstance(email, str):
        return None
    if display_name is not None and not isinstance(display_name, str):
        return None
    if expires_at <= int(time.time()):
        return None
    return AdminSession(
        subject=subject,
        role=role,
        expires_at=expires_at,
        user_id=user_id,
        email=email,
        display_name=display_name,
    )


def set_admin_session_cookie(
    response: Response,
    *,
    token: str,
    max_age: int,
    secure: bool = False,
) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=secure,
        max_age=max_age,
        path="/",
    )


def clear_admin_session_cookie(response: Response, *, secure: bool = False) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
    )
