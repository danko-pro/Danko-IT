from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from math import ceil


@dataclass(frozen=True, slots=True)
class LoginRateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None = None
    reason: str | None = None


@dataclass(slots=True)
class _LoginRateLimitEntry:
    failures: list[float] = field(default_factory=list)
    locked_until: float | None = None


class LoginRateLimiter:
    def __init__(
        self,
        *,
        attempts: int,
        window_seconds: int,
        lockout_seconds: int,
        time_func: Callable[[], float] | None = None,
    ) -> None:
        self.attempts = max(1, int(attempts))
        self.window_seconds = max(60, int(window_seconds))
        self.lockout_seconds = max(60, int(lockout_seconds))
        self._time_func = time_func or time.time
        self._entries: dict[str, _LoginRateLimitEntry] = {}

    def check(self, keys: tuple[str, ...]) -> LoginRateLimitDecision:
        now = self._now()
        for key in self._normalized_keys(keys):
            entry = self._entries.get(key)
            if entry is None:
                continue
            self._prune_entry(entry, now)
            if entry.locked_until is not None and entry.locked_until > now:
                return LoginRateLimitDecision(
                    allowed=False,
                    retry_after_seconds=max(1, ceil(entry.locked_until - now)),
                    reason="locked",
                )
        return LoginRateLimitDecision(allowed=True)

    def record_failure(self, keys: tuple[str, ...]) -> LoginRateLimitDecision:
        now = self._now()
        current_decision = self.check(keys)
        if not current_decision.allowed:
            return current_decision

        locked_until: float | None = None
        for key in self._normalized_keys(keys):
            entry = self._entries.setdefault(key, _LoginRateLimitEntry())
            self._prune_entry(entry, now)
            entry.failures.append(now)
            if len(entry.failures) >= self.attempts:
                entry.locked_until = now + self.lockout_seconds
                locked_until = max(locked_until or entry.locked_until, entry.locked_until)

        if locked_until is not None:
            return LoginRateLimitDecision(
                allowed=False,
                retry_after_seconds=max(1, ceil(locked_until - now)),
                reason="locked",
            )
        return LoginRateLimitDecision(allowed=True)

    def record_success(self, keys: tuple[str, ...]) -> None:
        for key in self._normalized_keys(keys):
            self._entries.pop(key, None)

    def _now(self) -> float:
        return float(self._time_func())

    def _prune_entry(self, entry: _LoginRateLimitEntry, now: float) -> None:
        cutoff = now - self.window_seconds
        entry.failures = [failure_at for failure_at in entry.failures if failure_at >= cutoff]
        if entry.locked_until is not None and entry.locked_until <= now:
            entry.locked_until = None

    def _normalized_keys(self, keys: tuple[str, ...]) -> tuple[str, ...]:
        return tuple(dict.fromkeys(key.strip() for key in keys if key and key.strip()))
