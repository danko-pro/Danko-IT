from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True, slots=True)
class StoredFile:
    key: str
    content_type: str
    size_bytes: int


class FileStorageAdapter(Protocol):
    async def put_stream(
        self,
        key: str,
        chunks: AsyncIterator[bytes],
        *,
        content_type: str,
        max_bytes: int | None = None,
    ) -> StoredFile:
        pass

    async def delete(self, key: str) -> None:
        pass

    def resolve_local_path(self, key: str) -> Path | None:
        pass
