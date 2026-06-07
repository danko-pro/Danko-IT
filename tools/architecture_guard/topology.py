from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .patterns import matches_any


@dataclass(frozen=True, slots=True)
class TopologyRule:
    name: str
    directory_patterns: tuple[str, ...]
    required_children: tuple[str, ...]
    required_any_of: tuple[str, ...]
    allowed_children: tuple[str, ...]
    allow_extra_children: bool
    severity: str
    message: str


@dataclass(frozen=True, slots=True)
class TopologyViolation:
    violation_id: str
    relative_path: str
    absolute_path: Path
    subject_path: str
    rule_name: str
    severity: str
    message: str


def load_topology_rules(
    value: object,
    *,
    severity_names: set[str],
    load_string_list,
) -> tuple[TopologyRule, ...]:
    if value is None:
        return ()
    if not isinstance(value, list):
        raise ValueError("topology_rules must be a list.")

    rules: list[TopologyRule] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"topology_rules[{index}] must be an object.")

        name = str(item.get("name", "")).strip()
        if not name:
            raise ValueError(f"topology_rules[{index}].name must be a non-empty string.")

        directory_patterns = load_string_list(
            item.get("directory_patterns"),
            field_name=f"topology_rules[{index}].directory_patterns",
        )
        if not directory_patterns:
            raise ValueError(f"topology_rules[{index}].directory_patterns must be a non-empty list.")

        required_children = load_string_list(
            item.get("required_children"),
            field_name=f"topology_rules[{index}].required_children",
        )
        required_any_of = load_string_list(
            item.get("required_any_of"),
            field_name=f"topology_rules[{index}].required_any_of",
        )
        allowed_children = load_string_list(
            item.get("allowed_children"),
            field_name=f"topology_rules[{index}].allowed_children",
        )
        allow_extra_children = bool(item.get("allow_extra_children", True))

        severity = str(item.get("severity", "error")).strip().lower()
        if severity not in severity_names:
            raise ValueError(f"topology_rules[{index}].severity must be one of: {', '.join(sorted(severity_names))}.")

        message = str(item.get("message", "")).strip()
        rules.append(
            TopologyRule(
                name=name,
                directory_patterns=directory_patterns,
                required_children=required_children,
                required_any_of=required_any_of,
                allowed_children=allowed_children,
                allow_extra_children=allow_extra_children,
                severity=severity,
                message=message,
            )
        )

    return tuple(rules)


def collect_topology_violations(config, discovered_directories: set[str]) -> dict[str, TopologyViolation]:
    violations: dict[str, TopologyViolation] = {}

    for rule in config.topology_rules:
        matched_directories = _match_directories(rule.directory_patterns, discovered_directories)
        for missing_directory in _missing_exact_directories(rule.directory_patterns, discovered_directories):
            absolute_path = _absolute_path(config.root, missing_directory)
            message = _compose_message(rule.message, f"Missing required directory: {missing_directory}.")
            violation = TopologyViolation(
                violation_id=f"{rule.name}|missing-directory|{missing_directory}",
                relative_path=missing_directory,
                absolute_path=absolute_path,
                subject_path=missing_directory,
                rule_name=rule.name,
                severity=rule.severity,
                message=message,
            )
            violations[violation.violation_id] = violation

        for relative_path in sorted(matched_directories):
            absolute_path = _absolute_path(config.root, relative_path)
            child_names = tuple(entry.name for entry in os.scandir(absolute_path))

            for pattern in rule.required_children:
                if matches_any_in_names(child_names, pattern):
                    continue
                subject_path = _join_child(relative_path, pattern)
                message = _compose_message(rule.message, f"Missing required child: {pattern}.")
                violation = TopologyViolation(
                    violation_id=f"{rule.name}|missing-child|{relative_path}|{pattern}",
                    relative_path=relative_path,
                    absolute_path=absolute_path,
                    subject_path=subject_path,
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=message,
                )
                violations[violation.violation_id] = violation

            if rule.required_any_of and not any(
                matches_any_in_names(child_names, pattern) for pattern in rule.required_any_of
            ):
                expected = ", ".join(rule.required_any_of)
                message = _compose_message(rule.message, f"Missing required entrypoint. Expected one of: {expected}.")
                violation = TopologyViolation(
                    violation_id=f"{rule.name}|missing-any-of|{relative_path}|{expected}",
                    relative_path=relative_path,
                    absolute_path=absolute_path,
                    subject_path=relative_path,
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=message,
                )
                violations[violation.violation_id] = violation

            if rule.allow_extra_children:
                continue

            for child_name in child_names:
                if matches_any(child_name, rule.allowed_children):
                    continue
                subject_path = _join_child(relative_path, child_name)
                message = _compose_message(rule.message, f"Unexpected child: {child_name}.")
                violation = TopologyViolation(
                    violation_id=f"{rule.name}|unexpected-child|{relative_path}|{child_name}",
                    relative_path=relative_path,
                    absolute_path=absolute_path,
                    subject_path=subject_path,
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=message,
                )
                violations[violation.violation_id] = violation

    return violations


def matches_any_in_names(names: tuple[str, ...], pattern: str) -> bool:
    return any(matches_any(name, (pattern,)) for name in names)


def _match_directories(directory_patterns: tuple[str, ...], discovered_directories: set[str]) -> set[str]:
    matched: set[str] = set()
    for pattern in directory_patterns:
        if _has_wildcards(pattern):
            matched.update(path for path in discovered_directories if matches_any(path, (pattern,)))
            continue
        if pattern in discovered_directories:
            matched.add(pattern)
    return matched


def _missing_exact_directories(directory_patterns: tuple[str, ...], discovered_directories: set[str]) -> set[str]:
    missing: set[str] = set()
    for pattern in directory_patterns:
        if _has_wildcards(pattern):
            continue
        if pattern not in discovered_directories:
            missing.add(pattern)
    return missing


def _absolute_path(root: Path, relative_path: str) -> Path:
    if relative_path in ("", "."):
        return root
    return root / relative_path


def _compose_message(prefix: str, suffix: str) -> str:
    if prefix:
        return f"{prefix} {suffix}"
    return suffix


def _has_wildcards(pattern: str) -> bool:
    return "*" in pattern or "?" in pattern


def _join_child(relative_path: str, child_name: str) -> str:
    return child_name if relative_path in ("", ".") else f"{relative_path}/{child_name}"
