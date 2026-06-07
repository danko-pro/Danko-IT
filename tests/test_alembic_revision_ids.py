from __future__ import annotations

import ast
from pathlib import Path

ALEMBIC_VERSION_NUM_MAX_LENGTH = 32
MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations" / "versions"


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
