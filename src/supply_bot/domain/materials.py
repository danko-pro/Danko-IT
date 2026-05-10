from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class MaterialSearchTarget:
    type: str
    id: int
    title: str
    family_id: int | None
    variant_id: int | None
    sku_id: int | None

    def to_api_dict(self) -> dict[str, Any]:
        return asdict(self)
