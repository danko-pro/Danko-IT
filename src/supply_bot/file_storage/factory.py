from __future__ import annotations

from supply_bot.config import Settings
from supply_bot.file_storage.base import FileStorageAdapter
from supply_bot.file_storage.local import LocalFileStorageAdapter


def create_file_storage_adapter(settings: Settings) -> FileStorageAdapter:
    backend = settings.file_storage_backend.strip().lower()
    if backend == "local":
        return LocalFileStorageAdapter(settings.project_documents_dir)
    raise ValueError(f"Unsupported file storage backend: {settings.file_storage_backend}")
