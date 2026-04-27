from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .patterns import matches_any
from .topology import TopologyRule, load_topology_rules


DEFAULT_CONFIG_FILE_NAME = "architecture_guard.json"


@dataclass(frozen=True, slots=True)
class LimitRule:
    name: str
    patterns: tuple[str, ...]
    max_lines: int


@dataclass(frozen=True, slots=True)
class SeverityThreshold:
    name: str
    min_exceeded_by: int


@dataclass(frozen=True, slots=True)
class LayerRule:
    name: str
    source_patterns: tuple[str, ...]
    forbidden_import_patterns: tuple[str, ...]
    allowed_import_patterns: tuple[str, ...]
    severity: str
    message: str


DEFAULT_SEVERITY_THRESHOLDS = (
    SeverityThreshold(name="critical", min_exceeded_by=101),
    SeverityThreshold(name="error", min_exceeded_by=51),
    SeverityThreshold(name="warn", min_exceeded_by=21),
    SeverityThreshold(name="note", min_exceeded_by=1),
)


@dataclass(frozen=True, slots=True)
class GuardConfig:
    root: Path
    source_path: Path
    poll_interval_seconds: float
    exclude_patterns: tuple[str, ...]
    rules: tuple[LimitRule, ...]
    layer_rules: tuple[LayerRule, ...]
    topology_rules: tuple[TopologyRule, ...]
    severity_thresholds: tuple[SeverityThreshold, ...]

    def is_excluded(self, relative_path: str) -> bool:
        return matches_any(relative_path, self.exclude_patterns)

    def resolve_rule(self, relative_path: str) -> LimitRule | None:
        if self.is_excluded(relative_path):
            return None
        for rule in self.rules:
            if matches_any(relative_path, rule.patterns):
                return rule
        return None

    def resolve_layer_rules(self, relative_path: str) -> tuple[LayerRule, ...]:
        if self.is_excluded(relative_path):
            return ()
        return tuple(rule for rule in self.layer_rules if matches_any(relative_path, rule.source_patterns))

    def classify_severity(self, exceeded_by: int) -> str:
        if exceeded_by <= 0:
            raise ValueError("exceeded_by must be greater than zero.")

        for threshold in self.severity_thresholds:
            if exceeded_by >= threshold.min_exceeded_by:
                return threshold.name
        return self.severity_thresholds[-1].name


def default_config_path(root: Path) -> Path:
    return (root / DEFAULT_CONFIG_FILE_NAME).resolve()


def load_guard_config(root: Path, config_path: Path | None = None) -> GuardConfig:
    resolved_root = root.resolve()
    resolved_config_path = (config_path or default_config_path(resolved_root)).resolve()
    payload = json.loads(resolved_config_path.read_text(encoding="utf-8-sig"))

    poll_interval_seconds = float(payload.get("poll_interval_seconds", 2.0))
    if poll_interval_seconds <= 0:
        raise ValueError("poll_interval_seconds must be greater than zero.")

    exclude_patterns = _load_string_list(payload.get("exclude_patterns"), field_name="exclude_patterns")
    severity_thresholds = _load_severity_thresholds(payload.get("severity_thresholds"))
    severity_names = {item.name for item in severity_thresholds}
    rules_payload = payload.get("rules")
    if not isinstance(rules_payload, list) or not rules_payload:
        raise ValueError("rules must be a non-empty list.")

    rules: list[LimitRule] = []
    for index, rule_payload in enumerate(rules_payload):
        if not isinstance(rule_payload, dict):
            raise ValueError(f"rules[{index}] must be an object.")

        name = str(rule_payload.get("name", "")).strip()
        if not name:
            raise ValueError(f"rules[{index}].name must be a non-empty string.")

        patterns = _load_string_list(rule_payload.get("patterns"), field_name=f"rules[{index}].patterns")
        if not patterns:
            raise ValueError(f"rules[{index}].patterns must be a non-empty list.")

        max_lines = int(rule_payload.get("max_lines", 0))
        if max_lines <= 0:
            raise ValueError(f"rules[{index}].max_lines must be greater than zero.")

        rules.append(LimitRule(name=name, patterns=patterns, max_lines=max_lines))

    layer_rules_payload = payload.get("layer_rules")
    layer_rules = _load_layer_rules(layer_rules_payload, severity_names=severity_names)
    topology_rules = load_topology_rules(
        payload.get("topology_rules"),
        severity_names=severity_names,
        load_string_list=_load_string_list,
    )

    return GuardConfig(
        root=resolved_root,
        source_path=resolved_config_path,
        poll_interval_seconds=poll_interval_seconds,
        exclude_patterns=exclude_patterns,
        rules=tuple(rules),
        layer_rules=layer_rules,
        topology_rules=topology_rules,
        severity_thresholds=severity_thresholds,
    )
def _load_string_list(value: object, *, field_name: str) -> tuple[str, ...]:
    if value is None:
        return ()
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list.")

    items: list[str] = []
    for index, item in enumerate(value):
        if not isinstance(item, str):
            raise ValueError(f"{field_name}[{index}] must be a string.")
        normalized = item.strip()
        if not normalized:
            raise ValueError(f"{field_name}[{index}] must not be empty.")
        items.append(normalized)
    return tuple(items)


def _load_severity_thresholds(value: object) -> tuple[SeverityThreshold, ...]:
    if value is None:
        return DEFAULT_SEVERITY_THRESHOLDS
    if not isinstance(value, list) or not value:
        raise ValueError("severity_thresholds must be a non-empty list.")

    thresholds: list[SeverityThreshold] = []
    names: set[str] = set()

    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"severity_thresholds[{index}] must be an object.")

        name = str(item.get("name", "")).strip().lower()
        if not name:
            raise ValueError(f"severity_thresholds[{index}].name must be a non-empty string.")
        if name in names:
            raise ValueError(f"severity_thresholds[{index}].name must be unique.")
        names.add(name)

        min_exceeded_by = int(item.get("min_exceeded_by", 0))
        if min_exceeded_by <= 0:
            raise ValueError(
                f"severity_thresholds[{index}].min_exceeded_by must be greater than zero."
            )

        thresholds.append(SeverityThreshold(name=name, min_exceeded_by=min_exceeded_by))

    ordered = tuple(sorted(thresholds, key=lambda item: item.min_exceeded_by, reverse=True))
    if ordered[-1].min_exceeded_by != 1:
        raise ValueError("severity_thresholds must include a lowest band with min_exceeded_by = 1.")
    return ordered


def _load_layer_rules(
    value: object,
    *,
    severity_names: set[str],
) -> tuple[LayerRule, ...]:
    if value is None:
        return ()
    if not isinstance(value, list):
        raise ValueError("layer_rules must be a list.")

    rules: list[LayerRule] = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            raise ValueError(f"layer_rules[{index}] must be an object.")

        name = str(item.get("name", "")).strip()
        if not name:
            raise ValueError(f"layer_rules[{index}].name must be a non-empty string.")

        source_patterns = _load_string_list(
            item.get("source_patterns"),
            field_name=f"layer_rules[{index}].source_patterns",
        )
        if not source_patterns:
            raise ValueError(f"layer_rules[{index}].source_patterns must be a non-empty list.")

        forbidden_import_patterns = _load_string_list(
            item.get("forbidden_import_patterns"),
            field_name=f"layer_rules[{index}].forbidden_import_patterns",
        )
        if not forbidden_import_patterns:
            raise ValueError(f"layer_rules[{index}].forbidden_import_patterns must be a non-empty list.")

        allowed_import_patterns = _load_string_list(
            item.get("allowed_import_patterns"),
            field_name=f"layer_rules[{index}].allowed_import_patterns",
        )

        severity = str(item.get("severity", "error")).strip().lower()
        if severity not in severity_names:
            raise ValueError(
                f"layer_rules[{index}].severity must be one of: {', '.join(sorted(severity_names))}."
            )

        message = str(item.get("message", "")).strip()
        rules.append(
            LayerRule(
                name=name,
                source_patterns=source_patterns,
                forbidden_import_patterns=forbidden_import_patterns,
                allowed_import_patterns=allowed_import_patterns,
                severity=severity,
                message=message,
            )
        )

    return tuple(rules)
