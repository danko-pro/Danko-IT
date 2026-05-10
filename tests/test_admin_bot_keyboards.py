from __future__ import annotations

from supply_bot.keyboards.admin_root_keyboards import (
    admin_root_keyboard,
    request_stale_reset_confirm_keyboard,
    requests_maintenance_keyboard,
)


def _buttons(markup) -> list[tuple[str, str]]:
    return [
        (button.text, button.callback_data)
        for row in markup.inline_keyboard
        for button in row
    ]


def test_admin_root_keyboard_exposes_requests_section() -> None:
    buttons = _buttons(admin_root_keyboard())

    assert ("Заявки", "adm:requests") in buttons


def test_requests_maintenance_keyboard_has_safe_reset_flow() -> None:
    buttons = _buttons(requests_maintenance_keyboard())
    confirm_buttons = _buttons(request_stale_reset_confirm_keyboard())

    assert ("Сбросить зависшие", "req:expire_stale:confirm") in buttons
    assert ("Да, сбросить", "req:expire_stale:run") in confirm_buttons
    assert ("Назад", "adm:requests") in confirm_buttons
