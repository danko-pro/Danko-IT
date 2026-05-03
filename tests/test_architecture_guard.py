from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.architecture_guard.config import load_guard_config
from tools.architecture_guard.runtime import build_runtime_paths
from tools.architecture_guard.scanner import build_watch_events, collect_snapshot

REPO_ROOT = Path(__file__).resolve().parents[1]


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_config(path: Path) -> None:
    payload = {
        "poll_interval_seconds": 0.2,
        "exclude_patterns": [".tmp", ".tmp/**"],
        "severity_thresholds": [
            {"name": "critical", "min_exceeded_by": 7},
            {"name": "error", "min_exceeded_by": 5},
            {"name": "warn", "min_exceeded_by": 3},
            {"name": "note", "min_exceeded_by": 1},
        ],
        "layer_rules": [
            {
                "name": "frontend-shared-boundary",
                "source_patterns": ["admin-ui/src/shared/**/*.ts"],
                "forbidden_import_patterns": ["admin-ui/src/features/**"],
                "severity": "error",
                "message": "Shared layer must not depend on features.",
            }
        ],
        "hygiene_rules": [
            {
                "name": "root-logs",
                "path_patterns": ["*.log"],
                "severity": "warn",
                "message": "Root logs are runtime artifacts.",
            }
        ],
        "rules": [
            {
                "name": "tests-python",
                "patterns": ["tests/**/*.py"],
                "max_lines": 5,
            },
            {
                "name": "frontend-feature-styles",
                "patterns": ["admin-ui/src/features/**/*.css"],
                "max_lines": 6,
            },
            {
                "name": "frontend-mock-data",
                "patterns": ["admin-ui/src/**/*.mock.ts"],
                "max_lines": 6,
            },
            {
                "name": "frontend-shared-types",
                "patterns": ["admin-ui/src/shared/types.ts"],
                "max_lines": 6,
            },
            {
                "name": "frontend-styles",
                "patterns": ["admin-ui/src/**/*.css"],
                "max_lines": 4,
            },
            {
                "name": "frontend-logic",
                "patterns": ["admin-ui/src/**/*.ts"],
                "max_lines": 3,
            },
            {
                "name": "backend-python",
                "patterns": ["src/**/*.py", "tools/**/*.py"],
                "max_lines": 3,
            },
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_collect_snapshot_applies_limits_by_rule(tmp_path: Path) -> None:
    write_file(tmp_path / "src" / "app.py", "a\nb\nc\nd\ne\nf\ng\nh\n")
    write_file(tmp_path / "tests" / "test_ok.py", "a\nb\nc\nd\n")
    write_file(tmp_path / "admin-ui" / "src" / "styles.css", "1\n2\n3\n4\n5\n")
    write_file(tmp_path / "admin-ui" / "src" / "features" / "panel.css", "1\n2\n3\n4\n5\n")
    write_file(tmp_path / "admin-ui" / "src" / "features" / "panel.ts", "export const panel = true;\n")
    write_file(tmp_path / "admin-ui" / "src" / "shared" / "types.ts", "1\n2\n3\n4\n5\n6\n")
    write_file(
        tmp_path / "admin-ui" / "src" / "shared" / "bad.ts",
        'import "../features/panel.ts";\nexport const bad = true;\n',
    )
    write_file(tmp_path / "admin-ui" / "src" / "model.mock.ts", "1\n2\n3\n4\n5\n6\n")
    write_file(tmp_path / ".tmp" / "ignored.py", "a\nb\nc\nd\ne\nf\n")
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert sorted(snapshot.violations) == ["admin-ui/src/styles.css", "src/app.py"]
    assert snapshot.violations["src/app.py"].limit == 3
    assert snapshot.violations["src/app.py"].severity == "error"
    assert snapshot.violations["admin-ui/src/styles.css"].limit == 4
    assert snapshot.violations["admin-ui/src/styles.css"].severity == "note"
    assert len(snapshot.layer_violations) == 1
    layer_violation = next(iter(snapshot.layer_violations.values()))
    assert layer_violation.relative_path == "admin-ui/src/shared/bad.ts"
    assert layer_violation.imported_path == "admin-ui/src/features/panel.ts"
    assert layer_violation.severity == "error"
    assert "tests/test_ok.py" not in snapshot.violations
    assert "admin-ui/src/features/panel.css" not in snapshot.violations
    assert "admin-ui/src/shared/types.ts" not in snapshot.violations
    assert "admin-ui/src/model.mock.ts" not in snapshot.violations
    assert ".tmp/ignored.py" not in snapshot.tracked_files


def test_build_watch_events_tracks_detect_update_and_clear(tmp_path: Path) -> None:
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)
    target_path = tmp_path / "src" / "app.py"
    write_file(target_path, "a\nb\nc\n")

    config = load_guard_config(tmp_path, config_path)
    baseline = collect_snapshot(config)
    assert baseline.violations == {}

    write_file(target_path, "a\nb\nc\nd\n")
    detected_snapshot = collect_snapshot(config)
    detected_events = build_watch_events(baseline, detected_snapshot)
    assert [event.kind for event in detected_events] == ["violation_detected"]
    assert detected_events[0].severity == "note"

    write_file(target_path, "a\nb\nc\nd\ne\nf\n")
    updated_snapshot = collect_snapshot(config)
    updated_events = build_watch_events(detected_snapshot, updated_snapshot)
    assert [event.kind for event in updated_events] == ["violation_updated"]
    assert updated_events[0].severity == "warn"

    write_file(target_path, "a\nb\n")
    cleared_snapshot = collect_snapshot(config)
    cleared_events = build_watch_events(updated_snapshot, cleared_snapshot)
    assert [event.kind for event in cleared_events] == ["violation_cleared"]
    assert cleared_events[0].severity == "warn"


def test_build_watch_events_tracks_layer_detect_and_clear(tmp_path: Path) -> None:
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)
    write_file(tmp_path / "admin-ui" / "src" / "features" / "panel.ts", "export const panel = true;\n")
    target_path = tmp_path / "admin-ui" / "src" / "shared" / "bad.ts"
    write_file(target_path, 'import "./local.ts";\nexport const bad = true;\n')
    write_file(tmp_path / "admin-ui" / "src" / "shared" / "local.ts", "export const local = true;\n")

    config = load_guard_config(tmp_path, config_path)
    baseline = collect_snapshot(config)
    assert baseline.layer_violations == {}

    write_file(target_path, 'import "../features/panel.ts";\nexport const bad = true;\n')
    detected_snapshot = collect_snapshot(config)
    detected_events = build_watch_events(baseline, detected_snapshot)
    assert [event.category for event in detected_events] == ["layer"]
    assert [event.kind for event in detected_events] == ["violation_detected"]
    assert detected_events[0].severity == "error"

    write_file(target_path, 'import "./local.ts";\nexport const bad = true;\n')
    cleared_snapshot = collect_snapshot(config)
    cleared_events = build_watch_events(detected_snapshot, cleared_snapshot)
    assert [event.category for event in cleared_events] == ["layer"]
    assert [event.kind for event in cleared_events] == ["violation_cleared"]
    assert cleared_events[0].severity == "error"


def test_layer_rules_can_allow_specific_source_files(tmp_path: Path) -> None:
    payload = {
        "poll_interval_seconds": 0.2,
        "exclude_patterns": [],
        "layer_rules": [
            {
                "name": "shared-boundary",
                "source_patterns": ["admin-ui/src/shared/**/*.ts"],
                "forbidden_import_patterns": ["admin-ui/src/features/**"],
                "allowed_source_patterns": ["admin-ui/src/shared/facade.ts"],
                "severity": "error",
                "message": "Shared files must not import features.",
            }
        ],
        "rules": [
            {
                "name": "frontend-logic",
                "patterns": ["admin-ui/src/**/*.ts"],
                "max_lines": 20,
            }
        ],
    }
    config_path = tmp_path / "architecture_guard.json"
    config_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_file(tmp_path / "admin-ui" / "src" / "features" / "panel.ts", "export const panel = true;\n")
    write_file(tmp_path / "admin-ui" / "src" / "shared" / "facade.ts", 'import "../features/panel";\n')
    write_file(tmp_path / "admin-ui" / "src" / "shared" / "bad.ts", 'import "../features/panel";\n')

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert len(snapshot.layer_violations) == 1
    violation = next(iter(snapshot.layer_violations.values()))
    assert violation.relative_path == "admin-ui/src/shared/bad.ts"


def test_collect_snapshot_tracks_ui_motion_notes(tmp_path: Path) -> None:
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)
    write_file(
        tmp_path / "admin-ui" / "src" / "features" / "panel.tsx",
        "export function Panel() {\n"
        "  const height = ref.current.getBoundingClientRect().height;\n"
        "  new ResizeObserver(() => height);\n"
        "  return <details style={{ height }}><summary>More</summary></details>;\n"
        "}\n",
    )

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert len(snapshot.ui_motion_violations) == 1
    violation = next(iter(snapshot.ui_motion_violations.values()))
    assert violation.rule_name == "expandable-motion-single-owner"
    assert violation.severity == "note"


def test_collect_snapshot_rejects_broad_ui_transitions(tmp_path: Path) -> None:
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)
    write_file(
        tmp_path / "admin-ui" / "src" / "styles" / "motion.css",
        ".tab-button { transition: all 300ms ease; }\n",
    )

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert len(snapshot.ui_motion_violations) == 1
    violation = next(iter(snapshot.ui_motion_violations.values()))
    assert violation.rule_name == "ui-motion-explicit-transitions"
    assert violation.severity == "warn"


def test_collect_snapshot_reports_workspace_hygiene_artifacts(tmp_path: Path) -> None:
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)
    write_file(tmp_path / "app.log", "runtime output\n")

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert len(snapshot.hygiene_violations) == 1
    violation = next(iter(snapshot.hygiene_violations.values()))
    assert violation.relative_path == "app.log"
    assert violation.rule_name == "root-logs"
    assert violation.severity == "warn"


def test_cli_check_refreshes_snapshot_files(tmp_path: Path) -> None:
    write_file(tmp_path / "src" / "app.py", "a\nb\nc\nd\n")
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "tools.architecture_guard",
            "check",
            "--root",
            str(tmp_path),
            "--config",
            str(config_path),
        ],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )

    runtime_paths = build_runtime_paths(tmp_path)
    assert completed.returncode == 1
    assert runtime_paths.snapshot_json_path.exists()
    assert runtime_paths.snapshot_text_path.exists()
    assert "Active violations: 1" in completed.stdout
    snapshot_payload = json.loads(runtime_paths.snapshot_json_path.read_text(encoding="utf-8"))
    assert snapshot_payload["size_violation_count"] == 1
    assert snapshot_payload["layer_violation_count"] == 0
    assert snapshot_payload["severity_counts"] == {"note": 1}
    assert snapshot_payload["violations"][0]["severity"] == "note"
