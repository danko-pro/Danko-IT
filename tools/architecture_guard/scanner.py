from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path

from .config import GuardConfig
from .events import create_layer_event, create_size_event, create_topology_event, create_ui_motion_event
from .layers import LayerViolation, collect_layer_violations
from .models import FileMeasure, ScanSnapshot, Violation, ViolationEvent
from .topology import TopologyViolation, collect_topology_violations
from .ui_motion import UiMotionViolation, collect_ui_motion_violations


def collect_snapshot(config: GuardConfig) -> ScanSnapshot:
    tracked_files: dict[str, FileMeasure] = {}
    violations: dict[str, Violation] = {}
    layer_violations: dict[str, LayerViolation] = {}
    ui_motion_violations: dict[str, UiMotionViolation] = {}
    discovered_directories: set[str] = {"."}

    for current_root, dir_names, file_names in os.walk(config.root):
        current_root_path = Path(current_root)
        relative_dir = ""
        if current_root_path != config.root:
            relative_dir = current_root_path.relative_to(config.root).as_posix()
            discovered_directories.add(relative_dir)

        dir_names[:] = [name for name in dir_names if not config.is_excluded(_join_posix(relative_dir, name))]

        for file_name in file_names:
            relative_path = _join_posix(relative_dir, file_name)
            limit_rule = config.resolve_rule(relative_path)
            active_layer_rules = config.resolve_layer_rules(relative_path)
            should_scan_motion = _should_scan_ui_motion(relative_path)
            if limit_rule is None and not active_layer_rules and not should_scan_motion:
                continue

            absolute_path = current_root_path / file_name
            line_count = count_file_lines(absolute_path)
            tracked_files[relative_path] = FileMeasure(
                relative_path=relative_path,
                absolute_path=absolute_path,
                line_count=line_count,
                limit=limit_rule.max_lines if limit_rule is not None else None,
                rule_name=limit_rule.name if limit_rule is not None else None,
                fingerprint=file_fingerprint(absolute_path),
            )

            if limit_rule is not None and line_count > limit_rule.max_lines:
                exceeded_by = line_count - limit_rule.max_lines
                violations[relative_path] = Violation(
                    relative_path=relative_path,
                    absolute_path=absolute_path,
                    line_count=line_count,
                    limit=limit_rule.max_lines,
                    rule_name=limit_rule.name,
                    severity=config.classify_severity(exceeded_by),
                    exceeded_by=exceeded_by,
                )

            if active_layer_rules:
                layer_violations.update(
                    collect_layer_violations(
                        config,
                        relative_path=relative_path,
                        absolute_path=absolute_path,
                    )
                )

            if should_scan_motion:
                ui_motion_violations.update(collect_ui_motion_violations(relative_path, absolute_path))

    topology_violations = collect_topology_violations(config, discovered_directories)
    return ScanSnapshot(
        scanned_at=now_iso(),
        tracked_files=tracked_files,
        violations=violations,
        layer_violations=layer_violations,
        topology_violations=topology_violations,
        ui_motion_violations=ui_motion_violations,
    )


def build_initial_events(snapshot: ScanSnapshot) -> list[ViolationEvent]:
    size_events = [
        create_size_event("violation_present", violation)
        for violation in sorted(snapshot.violations.values(), key=lambda item: (-item.line_count, item.relative_path))
    ]
    layer_events = [
        create_layer_event("violation_present", violation)
        for violation in sorted(
            snapshot.layer_violations.values(),
            key=lambda item: (item.relative_path, item.import_line, item.imported_path, item.rule_name),
        )
    ]
    topology_events = [
        create_topology_event("violation_present", violation)
        for violation in sorted(
            snapshot.topology_violations.values(),
            key=lambda item: (item.relative_path, item.subject_path, item.rule_name),
        )
    ]
    motion_events = [
        create_ui_motion_event("violation_present", violation)
        for violation in sorted(
            snapshot.ui_motion_violations.values(),
            key=lambda item: (item.relative_path, item.line_number, item.rule_name),
        )
    ]
    return size_events + layer_events + topology_events + motion_events


def build_watch_events(previous: ScanSnapshot, current: ScanSnapshot) -> list[ViolationEvent]:
    events: list[ViolationEvent] = []
    changed_paths = _changed_paths(previous, current)

    for relative_path in sorted(changed_paths):
        previous_violation = previous.violations.get(relative_path)
        current_violation = current.violations.get(relative_path)

        if current_violation is not None and previous_violation is None:
            events.append(create_size_event("violation_detected", current_violation))
            continue

        if current_violation is not None and previous_violation is not None:
            events.append(create_size_event("violation_updated", current_violation))
            continue

        if current_violation is None and previous_violation is not None:
            events.append(create_size_event("violation_cleared", previous_violation))

    previous_layers = _group_layer_violations(previous)
    current_layers = _group_layer_violations(current)
    candidate_paths = set(previous_layers) | set(current_layers) | changed_paths

    for relative_path in sorted(candidate_paths):
        previous_items = previous_layers.get(relative_path, {})
        current_items = current_layers.get(relative_path, {})
        previous_keys = set(previous_items)
        current_keys = set(current_items)

        for key in sorted(previous_keys - current_keys):
            events.append(create_layer_event("violation_cleared", previous_items[key]))
        for key in sorted(current_keys - previous_keys):
            events.append(create_layer_event("violation_detected", current_items[key]))
        if relative_path in changed_paths:
            for key in sorted(previous_keys & current_keys):
                events.append(create_layer_event("violation_updated", current_items[key]))

    previous_topology = previous.topology_violations
    current_topology = current.topology_violations
    previous_keys = set(previous_topology)
    current_keys = set(current_topology)
    for key in sorted(previous_keys - current_keys):
        events.append(create_topology_event("violation_cleared", previous_topology[key]))
    for key in sorted(current_keys - previous_keys):
        events.append(create_topology_event("violation_detected", current_topology[key]))

    previous_motion = previous.ui_motion_violations
    current_motion = current.ui_motion_violations
    previous_keys = set(previous_motion)
    current_keys = set(current_motion)
    for key in sorted(previous_keys - current_keys):
        events.append(create_ui_motion_event("violation_cleared", previous_motion[key]))
    for key in sorted(current_keys - previous_keys):
        events.append(create_ui_motion_event("violation_detected", current_motion[key]))

    return events


def count_file_lines(path: Path) -> int:
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        return sum(1 for _ in handle)


def file_fingerprint(path: Path) -> str:
    stat = path.stat()
    return f"{stat.st_mtime_ns}:{stat.st_size}"


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _changed_paths(previous: ScanSnapshot, current: ScanSnapshot) -> set[str]:
    all_paths = set(previous.tracked_files) | set(current.tracked_files)
    changed_paths: set[str] = set()

    for relative_path in all_paths:
        previous_measure = previous.tracked_files.get(relative_path)
        current_measure = current.tracked_files.get(relative_path)
        if previous_measure is None or current_measure is None:
            changed_paths.add(relative_path)
            continue
        if previous_measure.fingerprint != current_measure.fingerprint:
            changed_paths.add(relative_path)

    return changed_paths


def _group_layer_violations(snapshot: ScanSnapshot) -> dict[str, dict[str, LayerViolation]]:
    grouped: dict[str, dict[str, LayerViolation]] = {}
    for violation in snapshot.layer_violations.values():
        grouped.setdefault(violation.relative_path, {})[violation.violation_id] = violation
    return grouped


def _join_posix(left: str, right: str) -> str:
    return right if not left else f"{left}/{right}"


def _should_scan_ui_motion(relative_path: str) -> bool:
    return relative_path.startswith("admin-ui/src/") and relative_path.endswith((".tsx", ".css"))
