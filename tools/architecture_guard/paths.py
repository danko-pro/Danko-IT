from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class GuardRuntimePaths:
    runtime_dir: Path
    pid_path: Path
    state_path: Path
    snapshot_json_path: Path
    snapshot_text_path: Path
    events_log_path: Path
    stdout_log_path: Path
    stderr_log_path: Path
    stop_request_path: Path


def build_runtime_paths(root: Path) -> GuardRuntimePaths:
    runtime_dir = root / ".tmp" / "architecture_guard"
    return GuardRuntimePaths(
        runtime_dir=runtime_dir,
        pid_path=runtime_dir / "guard.pid",
        state_path=runtime_dir / "state.json",
        snapshot_json_path=runtime_dir / "oversized_files.json",
        snapshot_text_path=runtime_dir / "oversized_files.txt",
        events_log_path=runtime_dir / "events.jsonl",
        stdout_log_path=runtime_dir / "watch.stdout.log",
        stderr_log_path=runtime_dir / "watch.stderr.log",
        stop_request_path=runtime_dir / "stop.request",
    )


def read_pid(paths: GuardRuntimePaths) -> int | None:
    if not paths.pid_path.exists():
        return None
    raw_value = paths.pid_path.read_text(encoding="utf-8").strip()
    if not raw_value.isdigit():
        return None
    return int(raw_value)


def pid_is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def load_json_file(path: Path) -> dict[str, object]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def cleanup_runtime_files(paths: GuardRuntimePaths) -> None:
    paths.pid_path.unlink(missing_ok=True)
    paths.stop_request_path.unlink(missing_ok=True)
