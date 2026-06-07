from __future__ import annotations

import ast
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

ALEMBIC_VERSION_NUM_MAX_LENGTH = 32
ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_DIR = ROOT / "migrations" / "versions"


def _literal_assignment(module: ast.Module, name: str) -> object:
    for node in module.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name) and node.target.id == name:
            return ast.literal_eval(node.value)
    raise AssertionError(f"Missing {name!r} assignment")


def _revision_values(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, tuple):
        return [item for item in value if isinstance(item, str)]
    raise AssertionError(f"Unsupported revision value: {value!r}")


def test_alembic_revision_ids_fit_version_table() -> None:
    too_long: list[str] = []

    for path in sorted(MIGRATIONS_DIR.glob("*.py")):
        module = ast.parse(path.read_text(encoding="utf-8-sig"))
        for field in ("revision", "down_revision"):
            value = _literal_assignment(module, field)
            for revision_id in _revision_values(value):
                if len(revision_id) > ALEMBIC_VERSION_NUM_MAX_LENGTH:
                    too_long.append(f"{path.name}:{field}={revision_id!r} ({len(revision_id)})")

    assert not too_long, "Alembic version_num is varchar(32): " + ", ".join(too_long)


def _run_alembic_upgrade(database_path: Path, revision_id: str) -> None:
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", revision_id],
        cwd=ROOT,
        env=_alembic_env(database_path),
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )

    assert result.returncode == 0, result.stdout + result.stderr


def _alembic_env(database_path: Path) -> dict[str, str]:
    env = os.environ.copy()
    env.pop("DATABASE_URL", None)
    env["DATABASE_PATH"] = str(database_path)
    return env


def _sqlite_columns(database_path: Path, table_name: str) -> set[str]:
    with sqlite3.connect(database_path) as connection:
        return {
            row[1]
            for row in connection.execute(
                f"PRAGMA table_info({table_name})",
            )
        }


def _alembic_version(database_path: Path) -> str:
    with sqlite3.connect(database_path) as connection:
        version = connection.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    return str(version)


def test_alembic_upgrade_from_catalog_assembly_head_adds_flooring_layout_labor_column(tmp_path: Path) -> None:
    database_path = tmp_path / "alembic.sqlite3"

    _run_alembic_upgrade(database_path, "0013_flooring_catalog_assemblies")

    assert _alembic_version(database_path) == "0013_flooring_catalog_assemblies"
    assert "labor_price_per_m2" not in _sqlite_columns(database_path, "estimate_flooring_layouts")

    _run_alembic_upgrade(database_path, "head")

    assert "labor_price_per_m2" in _sqlite_columns(database_path, "estimate_flooring_layouts")
    assert _alembic_version(database_path) == "0014_flooring_layout_labor"
