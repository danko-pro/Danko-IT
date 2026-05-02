from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class HygieneRule:
    name: str
    path_patterns: tuple[str, ...]
    severity: str
    message: str


@dataclass(frozen=True, slots=True)
class HygieneViolation:
    violation_id: str
    relative_path: str
    absolute_path: Path
    rule_name: str
    severity: str
    message: str


def load_hygiene_rules(
    value: object,
    *,
    severity_names: set[str],
    load_string_list,
) -> tuple[HygieneRule, ...]:
    if value is None:
        return ()
    if not isinstance(value, list):
        raise ValueError("hygiene_rules must be a list.")

    rules: list[HygieneRule] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"hygiene_rules[{index}] must be an object.")

        name = str(item.get("name", "")).strip()
        if not name:
            raise ValueError(f"hygiene_rules[{index}].name must be a non-empty string.")

        path_patterns = load_string_list(
            item.get("path_patterns"),
            field_name=f"hygiene_rules[{index}].path_patterns",
        )
        if not path_patterns:
            raise ValueError(f"hygiene_rules[{index}].path_patterns must be a non-empty list.")

        severity = str(item.get("severity", "warn")).strip().lower()
        if severity not in severity_names:
            raise ValueError(
                f"hygiene_rules[{index}].severity must be one of: {', '.join(sorted(severity_names))}."
            )

        message = str(item.get("message", "")).strip()
        rules.append(HygieneRule(name=name, path_patterns=path_patterns, severity=severity, message=message))
    return tuple(rules)


def collect_hygiene_violations(config) -> dict[str, HygieneViolation]:
    violations: dict[str, HygieneViolation] = {}
    for rule in config.hygiene_rules:
        matched_paths: set[Path] = set()
        for pattern in rule.path_patterns:
            matched_paths.update(config.root.glob(pattern))

        for absolute_path in sorted(matched_paths):
            if not absolute_path.exists():
                continue
            relative_path = absolute_path.relative_to(config.root).as_posix()
            violation = HygieneViolation(
                violation_id=f"{rule.name}|{relative_path}",
                relative_path=relative_path,
                absolute_path=absolute_path,
                rule_name=rule.name,
                severity=rule.severity,
                message=rule.message or "Generated workspace artifact should not be present here.",
            )
            violations[violation.violation_id] = violation
    return violations
