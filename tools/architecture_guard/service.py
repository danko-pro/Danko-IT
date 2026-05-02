from __future__ import annotations

import atexit
import json
import os
import sys
import time
from pathlib import Path

from .config import load_guard_config
from .paths import build_runtime_paths, cleanup_runtime_files, load_json_file, pid_is_running, read_pid
from .processes import resolve_status_pid, spawn_detached_process, terminate_process
from .reporting import GuardReporter, render_snapshot_text
from .scanner import ScanSnapshot, build_initial_events, build_watch_events, collect_snapshot
from .snapshot import total_violation_count

MODULE_ROOT = Path(__file__).resolve().parents[2]
def run_check(root: Path, config_path: Path | None = None) -> int:
    config = load_guard_config(root, config_path)
    paths = build_runtime_paths(config.root)
    reporter = GuardReporter(paths, echo=False)
    snapshot = collect_snapshot(config)
    reporter.write_snapshot(snapshot)
    reporter.write_state(running=False, root=config.root, config=config, snapshot=snapshot, pid=None)

    print(
        f"[architecture-guard] Scanned {len(snapshot.tracked_files)} tracked files. "
        f"Active violations: {total_violation_count(snapshot)}.",
        flush=True,
    )
    if total_violation_count(snapshot):
        print(render_snapshot_text(snapshot), flush=True)
        return 1
    print("[architecture-guard] No active architecture violations.", flush=True)
    return 0
def run_watch(root: Path, config_path: Path | None = None, interval_override: float | None = None) -> int:
    config = load_guard_config(root, config_path)
    poll_interval = interval_override or config.poll_interval_seconds
    if poll_interval <= 0:
        raise ValueError("interval must be greater than zero.")

    paths = build_runtime_paths(config.root)
    reporter = GuardReporter(paths, echo=True)
    paths.stop_request_path.unlink(missing_ok=True)
    paths.pid_path.write_text(str(os.getpid()), encoding="utf-8")
    atexit.register(cleanup_runtime_files, paths)

    previous_snapshot: ScanSnapshot | None = None

    try:
        while True:
            if paths.stop_request_path.exists():
                reporter.emit("[architecture-guard] Stop request received. Shutting down watcher.")
                break

            snapshot = collect_snapshot(config)
            reporter.write_snapshot(snapshot)
            events = (
                build_initial_events(snapshot)
                if previous_snapshot is None
                else build_watch_events(previous_snapshot, snapshot)
            )

            for event in events:
                reporter.record_event(event)

            reporter.write_state(
                running=True,
                root=config.root,
                config=config,
                snapshot=snapshot,
                pid=os.getpid(),
            )

            if previous_snapshot is None:
                reporter.emit(
                    f"[architecture-guard] Initial scan complete. "
                    f"Tracked files: {len(snapshot.tracked_files)}. Violations: {total_violation_count(snapshot)}."
                )

            previous_snapshot = snapshot
            time.sleep(poll_interval)
    except KeyboardInterrupt:
        reporter.emit("[architecture-guard] Watch stopped by user.")
    finally:
        reporter.write_state(
            running=False,
            root=config.root,
            config=config,
            snapshot=previous_snapshot,
            pid=None,
        )
        cleanup_runtime_files(paths)

    return 0
def start_guard(root: Path, config_path: Path | None = None, interval_override: float | None = None) -> int:
    resolved_root = root.resolve()
    paths = build_runtime_paths(resolved_root)
    paths.runtime_dir.mkdir(parents=True, exist_ok=True)

    existing_pid = read_pid(paths)
    if existing_pid is not None and pid_is_running(existing_pid):
        print(f"[architecture-guard] Watcher already running with PID {existing_pid}.", flush=True)
        return 1

    paths.stop_request_path.unlink(missing_ok=True)
    stdout_handle = paths.stdout_log_path.open("a", encoding="utf-8")
    stderr_handle = paths.stderr_log_path.open("a", encoding="utf-8")

    command = [
        sys.executable,
        "-m",
        "tools.architecture_guard",
        "watch",
        "--root",
        str(resolved_root),
    ]
    if config_path is not None:
        command.extend(["--config", str(config_path.resolve())])
    if interval_override is not None:
        command.extend(["--interval", str(interval_override)])

    process = spawn_detached_process(command=command, cwd=MODULE_ROOT, stdout_handle=stdout_handle, stderr_handle=stderr_handle)
    stdout_handle.close()
    stderr_handle.close()

    deadline = time.time() + 5.0
    while time.time() < deadline:
        if pid_is_running(process.pid):
            break
        time.sleep(0.2)

    print(f"[architecture-guard] Watcher started with PID {process.pid}.", flush=True)
    print(f"[architecture-guard] State: {paths.state_path}", flush=True)
    print(f"[architecture-guard] Snapshot: {paths.snapshot_text_path}", flush=True)
    print(f"[architecture-guard] Event log: {paths.events_log_path}", flush=True)
    return 0
def stop_guard(root: Path) -> int:
    resolved_root = root.resolve()
    paths = build_runtime_paths(resolved_root)
    pid = read_pid(paths)
    if pid is None:
        print("[architecture-guard] Watcher is not running.", flush=True)
        return 0

    paths.runtime_dir.mkdir(parents=True, exist_ok=True)
    paths.stop_request_path.write_text("stop\n", encoding="utf-8")

    deadline = time.time() + 8.0
    while time.time() < deadline:
        if not pid_is_running(pid):
            break
        time.sleep(0.2)

    if pid_is_running(pid):
        terminate_process(pid)

    cleanup_runtime_files(paths)
    print(f"[architecture-guard] Watcher stopped (PID {pid}).", flush=True)
    return 0


def status_guard(root: Path, *, emit_json: bool = False) -> int:
    resolved_root = root.resolve()
    paths = build_runtime_paths(resolved_root)
    state = load_json_file(paths.state_path)
    snapshot = load_json_file(paths.snapshot_json_path)

    pid = resolve_status_pid(paths, state, read_pid=read_pid)
    running = bool(pid and pid_is_running(pid))
    payload = {
        "running": running,
        "pid": pid,
        "root": str(resolved_root),
        "config_path": state.get("config_path"),
        "last_scan_at": state.get("last_scan_at"),
        "tracked_file_count": snapshot.get("tracked_file_count", state.get("tracked_file_count", 0)),
        "size_violation_count": snapshot.get("size_violation_count", state.get("size_violation_count", 0)),
        "layer_violation_count": snapshot.get("layer_violation_count", state.get("layer_violation_count", 0)),
        "topology_violation_count": snapshot.get("topology_violation_count", state.get("topology_violation_count", 0)),
        "ui_motion_violation_count": snapshot.get("ui_motion_violation_count", state.get("ui_motion_violation_count", 0)),
        "hygiene_violation_count": snapshot.get("hygiene_violation_count", state.get("hygiene_violation_count", 0)),
        "violation_count": snapshot.get("violation_count", state.get("violation_count", 0)),
        "snapshot_json_path": str(paths.snapshot_json_path),
        "snapshot_text_path": str(paths.snapshot_text_path),
        "events_log_path": str(paths.events_log_path),
        "stdout_log_path": str(paths.stdout_log_path),
        "stderr_log_path": str(paths.stderr_log_path),
    }

    if emit_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
        return 0

    print(f"[architecture-guard] Running: {'yes' if running else 'no'}", flush=True)
    print(f"[architecture-guard] PID: {pid if pid is not None else '-'}", flush=True)
    print(f"[architecture-guard] Last scan: {payload['last_scan_at'] or '-'}", flush=True)
    print(f"[architecture-guard] Tracked files: {payload['tracked_file_count']}", flush=True)
    print(f"[architecture-guard] Active violations: {payload['violation_count']}", flush=True)
    print(
        f"[architecture-guard] Size violations: {payload['size_violation_count']} | "
        f"Layer violations: {payload['layer_violation_count']} | "
        f"Topology violations: {payload['topology_violation_count']} | "
        f"UI motion violations: {payload['ui_motion_violation_count']} | "
        f"Hygiene violations: {payload['hygiene_violation_count']}",
        flush=True,
    )
    print(f"[architecture-guard] Snapshot: {paths.snapshot_text_path}", flush=True)
    print(f"[architecture-guard] Event log: {paths.events_log_path}", flush=True)
    return 0
