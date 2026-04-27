from __future__ import annotations

from .layers import LayerViolation
from .topology import TopologyViolation
from .scanner import ScanSnapshot, Violation, ViolationEvent


def serialize_snapshot(snapshot: ScanSnapshot) -> dict[str, object]:
    size_violations = [
        serialize_violation(violation)
        for violation in sorted(snapshot.violations.values(), key=lambda item: (-item.line_count, item.relative_path))
    ]
    layer_violations = [
        serialize_layer_violation(violation)
        for violation in sorted(
            snapshot.layer_violations.values(),
            key=lambda item: (item.relative_path, item.import_line, item.imported_path, item.rule_name),
        )
    ]
    topology_violations = [
        serialize_topology_violation(violation)
        for violation in sorted(
            snapshot.topology_violations.values(),
            key=lambda item: (item.relative_path, item.subject_path, item.rule_name),
        )
    ]
    return {
        "scanned_at": snapshot.scanned_at,
        "tracked_file_count": len(snapshot.tracked_files),
        "size_violation_count": len(snapshot.violations),
        "layer_violation_count": len(snapshot.layer_violations),
        "topology_violation_count": len(snapshot.topology_violations),
        "violation_count": total_violation_count(snapshot),
        "severity_counts": summarize_severity_counts(snapshot),
        "violations": size_violations,
        "size_violations": size_violations,
        "layer_violations": layer_violations,
        "topology_violations": topology_violations,
    }


def serialize_violation(violation: Violation) -> dict[str, object]:
    return {
        "path": violation.relative_path,
        "absolute_path": str(violation.absolute_path),
        "line_count": violation.line_count,
        "limit": violation.limit,
        "rule_name": violation.rule_name,
        "severity": violation.severity,
        "exceeded_by": violation.exceeded_by,
    }


def serialize_layer_violation(violation: LayerViolation) -> dict[str, object]:
    return {
        "path": violation.relative_path,
        "absolute_path": str(violation.absolute_path),
        "imported_path": violation.imported_path,
        "import_line": violation.import_line,
        "rule_name": violation.rule_name,
        "severity": violation.severity,
        "message": violation.message,
    }


def serialize_topology_violation(violation: TopologyViolation) -> dict[str, object]:
    return {
        "path": violation.relative_path,
        "absolute_path": str(violation.absolute_path),
        "subject_path": violation.subject_path,
        "rule_name": violation.rule_name,
        "severity": violation.severity,
        "message": violation.message,
    }


def serialize_event(event: ViolationEvent) -> dict[str, object]:
    return {
        "time": event.recorded_at,
        "event": event.kind,
        "category": event.category,
        "path": event.relative_path,
        "line_count": event.line_count,
        "limit": event.limit,
        "rule_name": event.rule_name,
        "severity": event.severity,
        "exceeded_by": event.exceeded_by,
        "imported_path": event.imported_path,
        "import_line": event.import_line,
        "subject_path": event.subject_path,
        "message": event.message,
    }


def summarize_severity_counts(snapshot: ScanSnapshot) -> dict[str, int]:
    counts: dict[str, int] = {}
    for violation in snapshot.violations.values():
        counts[violation.severity] = counts.get(violation.severity, 0) + 1
    for violation in snapshot.layer_violations.values():
        counts[violation.severity] = counts.get(violation.severity, 0) + 1
    for violation in snapshot.topology_violations.values():
        counts[violation.severity] = counts.get(violation.severity, 0) + 1

    ordered_names = ("critical", "error", "warn", "note")
    ordered_counts = {name: counts[name] for name in ordered_names if name in counts}
    for name in sorted(counts):
        if name not in ordered_counts:
            ordered_counts[name] = counts[name]
    return ordered_counts


def total_violation_count(snapshot: ScanSnapshot) -> int:
    return len(snapshot.violations) + len(snapshot.layer_violations) + len(snapshot.topology_violations)
