from __future__ import annotations

from collections.abc import Callable
from typing import Any

# Общий контракт для bootstrap-слоя persistence.

ConnectionFactory = Callable[[], Any]

__all__ = ["ConnectionFactory"]
