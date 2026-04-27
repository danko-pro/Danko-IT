from __future__ import annotations

import re
from functools import lru_cache


def matches_any(relative_path: str, patterns: tuple[str, ...]) -> bool:
    return any(matches_pattern(relative_path, pattern) for pattern in patterns)


def matches_pattern(relative_path: str, pattern: str) -> bool:
    normalized_path = relative_path.strip("/")
    normalized_pattern = pattern.strip("/")

    if normalized_path == normalized_pattern:
        return True
    if normalized_pattern.endswith("/**") and normalized_path == normalized_pattern[:-3].rstrip("/"):
        return True
    if _compile_pattern(normalized_pattern).fullmatch(normalized_path):
        return True
    return False


@lru_cache(maxsize=512)
def _compile_pattern(pattern: str) -> re.Pattern[str]:
    parts: list[str] = ["^"]
    index = 0

    while index < len(pattern):
        token = pattern[index]

        if token == "*":
            next_is_star = index + 1 < len(pattern) and pattern[index + 1] == "*"
            if next_is_star:
                after_star = pattern[index + 2] if index + 2 < len(pattern) else ""
                if after_star == "/":
                    parts.append("(?:[^/]+/)*")
                    index += 3
                    continue
                parts.append(".*")
                index += 2
                continue

            parts.append("[^/]*")
            index += 1
            continue

        if token == "?":
            parts.append("[^/]")
            index += 1
            continue

        parts.append(re.escape(token))
        index += 1

    parts.append("$")
    return re.compile("".join(parts))
