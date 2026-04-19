from __future__ import annotations

from pathlib import Path

# SQL-схема хранится рядом с bootstrap-пакетом и читается как единый script.
SCHEMA = Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
