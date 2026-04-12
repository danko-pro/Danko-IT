from __future__ import annotations

from pathlib import Path

SCHEMA = Path(__file__).with_name("storage_schema.sql").read_text(encoding="utf-8")
