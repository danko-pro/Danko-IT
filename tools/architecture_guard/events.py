from __future__ import annotations

from datetime import UTC, datetime

from .layers import LayerViolation
from .models import Violation, ViolationEvent
from .topology import TopologyViolation
from .ui_motion import UiMotionViolation


def create_size_event(kind: str, violation: Violation) -> ViolationEvent:
    return ViolationEvent(
        category="size",
        kind=kind,
        recorded_at=_now_iso(),
        relative_path=violation.relative_path,
        line_count=violation.line_count,
        limit=violation.limit,
        rule_name=violation.rule_name,
        severity=violation.severity,
        exceeded_by=violation.exceeded_by,
        imported_path=None,
        import_line=None,
        subject_path=None,
        message=None,
    )


def create_layer_event(kind: str, violation: LayerViolation) -> ViolationEvent:
    return ViolationEvent(
        category="layer",
        kind=kind,
        recorded_at=_now_iso(),
        relative_path=violation.relative_path,
        line_count=None,
        limit=None,
        rule_name=violation.rule_name,
        severity=violation.severity,
        exceeded_by=None,
        imported_path=violation.imported_path,
        import_line=violation.import_line,
        subject_path=None,
        message=violation.message,
    )


def create_topology_event(kind: str, violation: TopologyViolation) -> ViolationEvent:
    return ViolationEvent(
        category="topology",
        kind=kind,
        recorded_at=_now_iso(),
        relative_path=violation.relative_path,
        line_count=None,
        limit=None,
        rule_name=violation.rule_name,
        severity=violation.severity,
        exceeded_by=None,
        imported_path=None,
        import_line=None,
        subject_path=violation.subject_path,
        message=violation.message,
    )


def create_ui_motion_event(kind: str, violation: UiMotionViolation) -> ViolationEvent:
    return ViolationEvent(
        category="ui_motion",
        kind=kind,
        recorded_at=_now_iso(),
        relative_path=violation.relative_path,
        line_count=None,
        limit=None,
        rule_name=violation.rule_name,
        severity=violation.severity,
        exceeded_by=None,
        imported_path=None,
        import_line=violation.line_number,
        subject_path=None,
        message=violation.message,
    )


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()
