from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from supply_bot.file_storage.base import StoredFile


class LocalFileStorageAdapter:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()

    async def put_stream(
        self,
        key: str,
        chunks: AsyncIterator[bytes],
        *,
        content_type: str,
        max_bytes: int | None = None,
    ) -> StoredFile:
        target_path = self._resolve_required_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        bytes_written = 0
        try:
            with target_path.open("wb") as target:
                async for chunk in chunks:
                    bytes_written += len(chunk)
                    if max_bytes is not None and bytes_written > max_bytes:
                        raise ValueError("File upload is too large")
                    target.write(chunk)
        except Exception:
            if target_path.exists():
                target_path.unlink()
            raise

        return StoredFile(key=key, content_type=content_type, size_bytes=bytes_written)

    async def delete(self, key: str) -> None:
        path = self._resolve_required_path(key)
        if path.exists():
            path.unlink()

    def resolve_local_path(self, key: str) -> Path | None:
        return self._resolve_required_path(key)

    def _resolve_required_path(self, key: str) -> Path:
        normalized_key = str(key or "").strip().replace("\\", "/")
        if not normalized_key:
            raise ValueError("File storage key is empty")

        resolved_path = (self.root / normalized_key).resolve()
        try:
            resolved_path.relative_to(self.root)
        except ValueError as exc:
            raise ValueError("Invalid file storage key") from exc
        return resolved_path
