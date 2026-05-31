from __future__ import annotations

import logging
import os

from supply_bot.admin_api.auth import hash_admin_password
from supply_bot.storage_auth import SqlAlchemyUserAuthRepository, normalize_app_user_email

logger = logging.getLogger(__name__)

ADMIN_BOOTSTRAP_EMAIL_ENV = "ADMIN_BOOTSTRAP_EMAIL"
ADMIN_BOOTSTRAP_PASSWORD_ENV = "ADMIN_BOOTSTRAP_PASSWORD"
ADMIN_BOOTSTRAP_DISPLAY_NAME_ENV = "ADMIN_BOOTSTRAP_DISPLAY_NAME"


async def bootstrap_admin_from_env(user_auth_repository: SqlAlchemyUserAuthRepository) -> None:
    email_raw = os.getenv(ADMIN_BOOTSTRAP_EMAIL_ENV, "").strip()
    password_raw = os.getenv(ADMIN_BOOTSTRAP_PASSWORD_ENV, "")
    if not email_raw or not password_raw.strip():
        return

    normalized_email = normalize_app_user_email(email_raw)
    if not normalized_email or "@" not in normalized_email:
        logger.info("Admin bootstrap skipped for email=%s", normalized_email or email_raw)
        return

    display_name_raw = os.getenv(ADMIN_BOOTSTRAP_DISPLAY_NAME_ENV, "").strip()
    display_name = display_name_raw or None

    try:
        password_hash = hash_admin_password(password_raw)
    except ValueError:
        logger.info("Admin bootstrap skipped for email=%s", normalized_email)
        return

    result = await user_auth_repository.provision_bootstrap_admin(
        email=normalized_email,
        password_hash=password_hash,
        display_name=display_name,
    )
    logger.info("Admin bootstrap %s for email=%s", result, normalized_email)
