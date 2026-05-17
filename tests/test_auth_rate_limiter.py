from __future__ import annotations

from supply_bot.admin_api.auth_rate_limit import LoginRateLimiter


class FakeClock:
    def __init__(self, value: float = 1000.0) -> None:
        self.value = value

    def __call__(self) -> float:
        return self.value

    def advance(self, seconds: float) -> None:
        self.value += seconds


def test_login_rate_limiter_allows_first_attempts_and_locks_after_limit() -> None:
    clock = FakeClock()
    limiter = LoginRateLimiter(
        attempts=3,
        window_seconds=60,
        lockout_seconds=120,
        time_func=clock,
    )
    keys = ("ip:127.0.0.1", "legacy-admin")

    assert limiter.check(keys).allowed is True
    assert limiter.record_failure(keys).allowed is True
    assert limiter.record_failure(keys).allowed is True

    decision = limiter.record_failure(keys)

    assert decision.allowed is False
    assert decision.retry_after_seconds is not None
    assert decision.retry_after_seconds > 0
    assert decision.reason == "locked"
    assert limiter.check(keys).allowed is False


def test_login_rate_limiter_record_success_clears_state() -> None:
    clock = FakeClock()
    limiter = LoginRateLimiter(
        attempts=2,
        window_seconds=60,
        lockout_seconds=120,
        time_func=clock,
    )
    keys = ("ip:127.0.0.1", "email:user@example.com")

    assert limiter.record_failure(keys).allowed is True
    limiter.record_success(keys)

    assert limiter.record_failure(keys).allowed is True


def test_login_rate_limiter_ignores_old_failures_outside_window() -> None:
    clock = FakeClock()
    limiter = LoginRateLimiter(
        attempts=2,
        window_seconds=60,
        lockout_seconds=120,
        time_func=clock,
    )
    keys = ("ip:127.0.0.1", "legacy-admin")

    assert limiter.record_failure(keys).allowed is True
    clock.advance(61)

    assert limiter.record_failure(keys).allowed is True
    assert limiter.check(keys).allowed is True
