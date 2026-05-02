from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.architecture_guard.config import load_guard_config
from tools.architecture_guard.runtime import build_runtime_paths
from tools.architecture_guard.scanner import collect_snapshot

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
        "topology_rules": [
            {
                "name": "ui-root",
                "directory_patterns": ["admin-ui/src"],
                "required_children": ["App.tsx", "features", "shared"],
                "allowed_children": ["App.tsx", "features", "shared"],
                "allow_extra_children": False,
                "severity": "error",
                "message": "UI root must stay compact and explicit.",
            },
            {
                "name": "feature-entry",
                "directory_patterns": ["admin-ui/src/features/*"],
                "required_any_of": ["screen.tsx", "index.tsx"],
                "severity": "warn",
                "message": "Each feature must expose an entrypoint.",
            },
        ],
        "rules": [
            {
                "name": "backend-python",
                "patterns": ["src/**/*.py", "tools/**/*.py"],
                "max_lines": 10,
            }
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_collect_snapshot_tracks_topology_violations(tmp_path: Path) -> None:
    write_file(tmp_path / "admin-ui" / "src" / "App.tsx", "export default null;\n")
    write_file(tmp_path / "admin-ui" / "src" / "rogue.tsx", "export default null;\n")
    write_file(tmp_path / "admin-ui" / "src" / "features" / "alpha" / "panel.tsx", "export const panel = true;\n")
    config_path = tmp_path / "architecture_guard.json"
    write_config(config_path)

    config = load_guard_config(tmp_path, config_path)
    snapshot = collect_snapshot(config)

    assert len(snapshot.topology_violations) == 3
    messages = sorted(violation.message for violation in snapshot.topology_violations.values())
    assert any("Missing required child: shared" in message for message in messages)
    assert any("Unexpected child: rogue.tsx" in message for message in messages)
    assert any("Missing required entrypoint" in message for message in messages)


def test_cli_check_reports_topology_violation_count(tmp_path: Path) -> None:
    write_file(tmp_path / "admin-ui" / "src" / "App.tsx", "export default null;\n")
    write_file(tmp_path / "admin-ui" / "src" / "features" / "alpha" / "screen.tsx", "export default null;\n")
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
    snapshot_payload = json.loads(runtime_paths.snapshot_json_path.read_text(encoding="utf-8"))
    assert completed.returncode == 1
    assert snapshot_payload["size_violation_count"] == 0
    assert snapshot_payload["layer_violation_count"] == 0
    assert snapshot_payload["topology_violation_count"] == 1
    assert snapshot_payload["severity_counts"] == {"error": 1}
