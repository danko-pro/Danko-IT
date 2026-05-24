from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from math import ceil


@dataclass(frozen=True, slots=True)
class PublicLeadRateLimitDecision:
    allowed: bool
    retry_after_seconds: int | None = None


class PublicLeadRateLimiter:
    def __init__(
        self,
        *,
        max_requests: int = 5,
        window_seconds: int = 600,
        time_func: Callable[[], float] | None = None,
    ) -> None:
        self.max_requests = max(1, int(max_requests))
        self.window_seconds = max(60, int(window_seconds))
        self._time_func = time_func or time.time
        self._requests_by_key: dict[str, list[float]] = {}

    def check(self, key: str) -> PublicLeadRateLimitDecision:
        normalized_key = key.strip() or "unknown"
        now = float(self._time_func())
        requests = self._pruned_requests(normalized_key, now)

        if len(requests) >= self.max_requests:
            retry_after = self.window_seconds - (now - requests[0])
            return PublicLeadRateLimitDecision(
                allowed=False,
                retry_after_seconds=max(1, ceil(retry_after)),
            )

        requests.append(now)
        self._requests_by_key[normalized_key] = requests
        return PublicLeadRateLimitDecision(allowed=True)

    def _pruned_requests(self, key: str, now: float) -> list[float]:
        cutoff = now - self.window_seconds
        requests = [
            requested_at
            for requested_at in self._requests_by_key.get(key, [])
            if requested_at > cutoff
        ]
        self._requests_by_key[key] = requests
        return requests
