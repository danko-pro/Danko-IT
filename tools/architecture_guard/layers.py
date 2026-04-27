from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .config import GuardConfig
from .patterns import matches_any


@dataclass(frozen=True, slots=True)
class ImportReference:
    line_number: int
    specifier: str
    resolved_path: str | None


@dataclass(frozen=True, slots=True)
class LayerViolation:
    violation_id: str
    relative_path: str
    absolute_path: Path
    imported_path: str
    import_line: int
    rule_name: str
    severity: str
    message: str


PYTHON_FROM_PATTERN = re.compile(r"^\s*from\s+([.\w]+)\s+import\b")
PYTHON_IMPORT_PATTERN = re.compile(r"^\s*import\s+(.+)$")
TS_FROM_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?[\s\w{},*\n\r]+?\s+from\s+['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)
TS_SIDE_EFFECT_PATTERN = re.compile(r"(?:^|\n)\s*import\s+['\"]([^'\"]+)['\"]", re.MULTILINE)


def collect_layer_violations(
    config: GuardConfig,
    *,
    relative_path: str,
    absolute_path: Path,
) -> dict[str, LayerViolation]:
    rules = config.resolve_layer_rules(relative_path)
    if not rules:
        return {}

    violations: dict[str, LayerViolation] = {}
    for reference in resolve_import_references(config.root, relative_path, absolute_path):
        if reference.resolved_path is None:
            continue
        for rule in rules:
            if not matches_any(reference.resolved_path, rule.forbidden_import_patterns):
                continue
            if rule.allowed_import_patterns and matches_any(reference.resolved_path, rule.allowed_import_patterns):
                continue

            violation_id = f"{relative_path}|{rule.name}|{reference.resolved_path}|{reference.line_number}"
            message = rule.message or (
                f"{relative_path} must not import {reference.resolved_path} under rule {rule.name}"
            )
            violations[violation_id] = LayerViolation(
                violation_id=violation_id,
                relative_path=relative_path,
                absolute_path=absolute_path,
                imported_path=reference.resolved_path,
                import_line=reference.line_number,
                rule_name=rule.name,
                severity=rule.severity,
                message=message,
            )
    return violations


def resolve_import_references(root: Path, relative_path: str, absolute_path: Path) -> list[ImportReference]:
    if relative_path.endswith(".py"):
        return _resolve_python_imports(root, relative_path, absolute_path)
    if relative_path.endswith((".ts", ".tsx", ".js", ".jsx")):
        return _resolve_ts_imports(root, relative_path, absolute_path)
    return []


def _resolve_python_imports(root: Path, relative_path: str, absolute_path: Path) -> list[ImportReference]:
    lines = absolute_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    references: list[ImportReference] = []

    for line_number, line in enumerate(lines, start=1):
        from_match = PYTHON_FROM_PATTERN.match(line)
        if from_match is not None:
            specifier = from_match.group(1).strip()
            references.append(
                ImportReference(
                    line_number=line_number,
                    specifier=specifier,
                    resolved_path=_resolve_python_specifier(root, relative_path, specifier),
                )
            )
            continue

        import_match = PYTHON_IMPORT_PATTERN.match(line)
        if import_match is None:
            continue

        for part in import_match.group(1).split(","):
            specifier = part.split(" as ", 1)[0].strip()
            if not specifier:
                continue
            references.append(
                ImportReference(
                    line_number=line_number,
                    specifier=specifier,
                    resolved_path=_resolve_python_specifier(root, relative_path, specifier),
                )
            )

    return references


def _resolve_ts_imports(root: Path, relative_path: str, absolute_path: Path) -> list[ImportReference]:
    text = absolute_path.read_text(encoding="utf-8", errors="ignore")
    references: list[ImportReference] = []
    matches = list(TS_FROM_PATTERN.finditer(text)) + list(TS_SIDE_EFFECT_PATTERN.finditer(text))

    for match in matches:
        specifier = match.group(1).strip()
        references.append(
            ImportReference(
                line_number=text.count("\n", 0, match.start()) + 1,
                specifier=specifier,
                resolved_path=_resolve_ts_specifier(root, relative_path, specifier),
            )
        )

    return references


def _resolve_python_specifier(root: Path, relative_path: str, specifier: str) -> str | None:
    if specifier.startswith("."):
        level = len(specifier) - len(specifier.lstrip("."))
        remainder = specifier[level:]
        base_dir = Path(relative_path).parent
        anchor = base_dir
        for _ in range(max(level - 1, 0)):
            anchor = anchor.parent
        target = anchor / remainder.replace(".", "/") if remainder else anchor
        return _resolve_python_candidate(root, target)

    target = Path(specifier.replace(".", "/"))
    for prefix in (Path(), Path("src")):
        resolved = _resolve_python_candidate(root, prefix / target)
        if resolved is not None:
            return resolved
    return None


def _resolve_python_candidate(root: Path, relative_target: Path) -> str | None:
    resolved_root = root.resolve()
    file_candidate = (root / relative_target.with_suffix(".py")).resolve()
    if file_candidate.exists():
        return file_candidate.relative_to(resolved_root).as_posix()

    package_candidate = (root / relative_target / "__init__.py").resolve()
    if package_candidate.exists():
        return package_candidate.relative_to(resolved_root).as_posix()
    return None


def _resolve_ts_specifier(root: Path, relative_path: str, specifier: str) -> str | None:
    if not specifier.startswith("."):
        return None

    resolved_root = root.resolve()
    base_dir = Path(relative_path).parent
    target = (base_dir / specifier).as_posix().replace("\\", "/")
    normalized_target = Path(target)
    candidate_strings = [str(normalized_target)]
    if normalized_target.suffix:
        candidate_strings.append(str(normalized_target.with_suffix("")))

    candidates: list[Path] = []
    for candidate in candidate_strings:
        path = Path(candidate)
        candidates.extend(
            [
                path,
                path.with_suffix(".ts"),
                path.with_suffix(".tsx"),
                path.with_suffix(".js"),
                path.with_suffix(".jsx"),
                path.with_suffix(".css"),
                path / "index.ts",
                path / "index.tsx",
                path / "index.js",
                path / "index.jsx",
            ]
        )

    for candidate in candidates:
        absolute_candidate = (root / candidate).resolve()
        if absolute_candidate.exists():
            return absolute_candidate.relative_to(resolved_root).as_posix()
    return None
