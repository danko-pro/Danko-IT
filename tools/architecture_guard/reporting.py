from __future__ import annotations

import json

from .config import GuardConfig
from .hygiene import HygieneViolation
from .layers import LayerViolation
from .paths import GuardRuntimePaths
from .scanner import ScanSnapshot, Violation, ViolationEvent
from .snapshot import serialize_event, serialize_snapshot, summarize_severity_counts, total_violation_count
from .topology import TopologyViolation
from .ui_motion import UiMotionViolation


SEVERITY_LABELS = {
    "note": "NOTE",
    "warn": "WARNING",
    "error": "ERROR",
    "critical": "CRITICAL",
}


class GuardReporter:
    def __init__(self, paths: GuardRuntimePaths, *, echo: bool) -> None:
        self._paths = paths
        self._echo = echo
        self._paths.runtime_dir.mkdir(parents=True, exist_ok=True)

    def emit(self, message: str) -> None:
        if self._echo:
            print(message, flush=True)

    def record_event(self, event: ViolationEvent) -> None:
        with self._paths.events_log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(serialize_event(event), ensure_ascii=False) + "\n")
        self.emit(render_event_message(event))

    def write_snapshot(self, snapshot: ScanSnapshot) -> None:
        self._paths.snapshot_json_path.write_text(
            json.dumps(serialize_snapshot(snapshot), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self._paths.snapshot_text_path.write_text(render_snapshot_text(snapshot), encoding="utf-8")

    def write_state(
        self,
        *,
        running: bool,
        root,
        config: GuardConfig,
        snapshot: ScanSnapshot | None,
        pid: int | None,
    ) -> None:
        payload = {
            "running": running,
            "pid": pid,
            "root": str(root),
            "config_path": str(config.source_path),
            "poll_interval_seconds": config.poll_interval_seconds,
            "last_scan_at": snapshot.scanned_at if snapshot is not None else None,
            "tracked_file_count": len(snapshot.tracked_files) if snapshot is not None else 0,
            "size_violation_count": len(snapshot.violations) if snapshot is not None else 0,
            "layer_violation_count": len(snapshot.layer_violations) if snapshot is not None else 0,
            "topology_violation_count": len(snapshot.topology_violations) if snapshot is not None else 0,
            "ui_motion_violation_count": len(snapshot.ui_motion_violations) if snapshot is not None else 0,
            "hygiene_violation_count": len(snapshot.hygiene_violations) if snapshot is not None else 0,
            "violation_count": total_violation_count(snapshot) if snapshot is not None else 0,
            "snapshot_json_path": str(self._paths.snapshot_json_path),
            "snapshot_text_path": str(self._paths.snapshot_text_path),
            "events_log_path": str(self._paths.events_log_path),
            "stdout_log_path": str(self._paths.stdout_log_path),
            "stderr_log_path": str(self._paths.stderr_log_path),
        }
        self._paths.state_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def render_snapshot_text(snapshot: ScanSnapshot) -> str:
    lines = [
        f"scanned_at: {snapshot.scanned_at}",
        f"tracked_file_count: {len(snapshot.tracked_files)}",
        f"size_violation_count: {len(snapshot.violations)}",
        f"layer_violation_count: {len(snapshot.layer_violations)}",
        f"topology_violation_count: {len(snapshot.topology_violations)}",
        f"ui_motion_violation_count: {len(snapshot.ui_motion_violations)}",
        f"hygiene_violation_count: {len(snapshot.hygiene_violations)}",
        f"violation_count: {total_violation_count(snapshot)}",
    ]

    if (
        not snapshot.violations
        and not snapshot.layer_violations
        and not snapshot.topology_violations
        and not snapshot.ui_motion_violations
        and not snapshot.hygiene_violations
    ):
        lines.append("No active architecture violations.")
        return "\n".join(lines)

    lines.append(f"severity_counts: {format_severity_counts(snapshot)}")
    if snapshot.violations:
        lines.append("Size violations:")
        for violation in sorted(
            snapshot.violations.values(),
            key=lambda item: (-item.exceeded_by, -item.line_count, item.relative_path),
        ):
            lines.append(format_violation_line(violation))
    if snapshot.layer_violations:
        lines.append("Layer violations:")
        for violation in sorted(
            snapshot.layer_violations.values(),
            key=lambda item: (item.relative_path, item.import_line, item.imported_path, item.rule_name),
        ):
            lines.append(format_layer_violation_line(violation))
    if snapshot.topology_violations:
        lines.append("Topology violations:")
        for violation in sorted(
            snapshot.topology_violations.values(),
            key=lambda item: (item.relative_path, item.subject_path, item.rule_name),
        ):
            lines.append(format_topology_violation_line(violation))
    if snapshot.ui_motion_violations:
        lines.append("UI motion violations:")
        for violation in sorted(
            snapshot.ui_motion_violations.values(),
            key=lambda item: (item.relative_path, item.line_number, item.rule_name),
        ):
            lines.append(format_ui_motion_violation_line(violation))
    if snapshot.hygiene_violations:
        lines.append("Workspace hygiene violations:")
        for violation in sorted(
            snapshot.hygiene_violations.values(),
            key=lambda item: (item.relative_path, item.rule_name),
        ):
            lines.append(format_hygiene_violation_line(violation))
    return "\n".join(lines)


def render_event_message(event: ViolationEvent) -> str:
    if event.category == "topology":
        return render_topology_event_message(event)
    if event.category == "ui_motion":
        return render_ui_motion_event_message(event)
    if event.category == "hygiene":
        return render_hygiene_event_message(event)
    if event.category == "layer":
        return render_layer_event_message(event)

    if event.kind == "violation_cleared":
        return f"[architecture-guard][INFO] Limit restored: {event.relative_path} is back within the allowed size."

    if event.kind == "violation_present":
        prefix = "Existing violation"
    elif event.kind == "violation_detected":
        prefix = "Limit exceeded after save"
    else:
        prefix = "Still over limit after save"

    label = severity_label(event.severity)
    return (
        f"[architecture-guard][{label}] {prefix}: {event.relative_path} has {event.line_count} lines, "
        f"limit {event.limit}, rule {event.rule_name}, severity {event.severity}, over by {event.exceeded_by}."
    )


def render_layer_event_message(event: ViolationEvent) -> str:
    if event.kind == "violation_cleared":
        return (
            f"[architecture-guard][INFO] Layer restored: {event.relative_path} no longer imports "
            f"{event.imported_path} in violation of {event.rule_name}."
        )

    if event.kind == "violation_present":
        prefix = "Existing layer violation"
    elif event.kind == "violation_detected":
        prefix = "Layer violation after save"
    else:
        prefix = "Still violates layer rule after save"

    label = severity_label(event.severity)
    return (
        f"[architecture-guard][{label}] {prefix}: {event.relative_path} imports {event.imported_path} "
        f"(line {event.import_line}), rule {event.rule_name}. {event.message}"
    )


def render_topology_event_message(event: ViolationEvent) -> str:
    if event.kind == "violation_cleared":
        return (
            f"[architecture-guard][INFO] Topology restored: {event.relative_path} no longer violates "
            f"{event.rule_name}."
        )

    prefix = "Existing topology violation" if event.kind == "violation_present" else "Topology violation after save"
    label = severity_label(event.severity)
    return (
        f"[architecture-guard][{label}] {prefix}: {event.relative_path}, subject {event.subject_path}, "
        f"rule {event.rule_name}. {event.message}"
    )


def render_ui_motion_event_message(event: ViolationEvent) -> str:
    if event.kind == "violation_cleared":
        return f"[architecture-guard][INFO] UI motion restored: {event.relative_path} no longer violates {event.rule_name}."

    prefix = "Existing UI motion violation" if event.kind == "violation_present" else "UI motion violation after save"
    label = severity_label(event.severity)
    return (
        f"[architecture-guard][{label}] {prefix}: {event.relative_path} "
        f"(line {event.import_line}), rule {event.rule_name}. {event.message}"
    )


def render_hygiene_event_message(event: ViolationEvent) -> str:
    if event.kind == "violation_cleared":
        return f"[architecture-guard][INFO] Workspace hygiene restored: {event.relative_path} was removed."

    prefix = "Existing workspace hygiene violation" if event.kind == "violation_present" else "Workspace hygiene violation"
    label = severity_label(event.severity)
    return (
        f"[architecture-guard][{label}] {prefix}: {event.relative_path}, "
        f"rule {event.rule_name}. {event.message}"
    )


def format_violation_line(violation: Violation) -> str:
    return (
        f"- {violation.relative_path}: {violation.line_count} lines | "
        f"limit {violation.limit} | rule {violation.rule_name} | "
        f"severity {violation.severity} | over by {violation.exceeded_by}"
    )


def format_layer_violation_line(violation: LayerViolation) -> str:
    return (
        f"- {violation.relative_path}: imports {violation.imported_path} "
        f"(line {violation.import_line}) | rule {violation.rule_name} | "
        f"severity {violation.severity} | {violation.message}"
    )


def format_topology_violation_line(violation: TopologyViolation) -> str:
    return (
        f"- {violation.relative_path}: subject {violation.subject_path} | "
        f"rule {violation.rule_name} | severity {violation.severity} | {violation.message}"
    )


def format_ui_motion_violation_line(violation: UiMotionViolation) -> str:
    return (
        f"- {violation.relative_path}: line {violation.line_number} | "
        f"rule {violation.rule_name} | severity {violation.severity} | {violation.message}"
    )


def format_hygiene_violation_line(violation: HygieneViolation) -> str:
    return (
        f"- {violation.relative_path}: rule {violation.rule_name} | "
        f"severity {violation.severity} | {violation.message}"
    )


def format_severity_counts(snapshot: ScanSnapshot) -> str:
    counts = summarize_severity_counts(snapshot)
    return ", ".join(f"{name} {count}" for name, count in counts.items())


def severity_label(severity: str | None) -> str:
    if severity is None:
        return "WARNING"
    return SEVERITY_LABELS.get(severity, severity.upper())
