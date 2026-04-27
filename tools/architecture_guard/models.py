from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .layers import LayerViolation
from .topology import TopologyViolation


@dataclass(frozen=True, slots=True)
class FileMeasure:
    relative_path: str
    absolute_path: Path
    line_count: int
    limit: int | None
    rule_name: str | None
    fingerprint: str


@dataclass(frozen=True, slots=True)
class Violation:
    relative_path: str
    absolute_path: Path
    line_count: int
    limit: int
    rule_name: str
    severity: str
    exceeded_by: int


@dataclass(frozen=True, slots=True)
class ViolationEvent:
    category: str
    kind: str
    recorded_at: str
    relative_path: str
    line_count: int | None
    limit: int | None
    rule_name: str | None
    severity: str | None
    exceeded_by: int | None
    imported_path: str | None
    import_line: int | None
    subject_path: str | None
    message: str | None


@dataclass(frozen=True, slots=True)
class ScanSnapshot:
    scanned_at: str
    tracked_files: dict[str, FileMeasure]
    violations: dict[str, Violation]
    layer_violations: dict[str, LayerViolation]
    topology_violations: dict[str, TopologyViolation]
