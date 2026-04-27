from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path


def resolve_status_pid(paths, state: dict[str, object], *, read_pid) -> int | None:
    if isinstance(state.get("pid"), int):
        return state["pid"]
    if isinstance(state.get("pid"), str) and state["pid"].isdigit():
        return int(state["pid"])
    return read_pid(paths)


def spawn_detached_process(
    *,
    command: list[str],
    cwd: Path,
    stdout_handle,
    stderr_handle,
) -> subprocess.Popen:
    popen_kwargs: dict[str, object] = {
        "args": command,
        "cwd": cwd,
        "stdout": stdout_handle,
        "stderr": stderr_handle,
        "stdin": subprocess.DEVNULL,
        "close_fds": True,
    }
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    else:
        popen_kwargs["start_new_session"] = True
    return subprocess.Popen(**popen_kwargs)


def terminate_process(pid: int) -> None:
    try:
        os.kill(pid, signal.SIGTERM)
        time.sleep(0.5)
        return
    except PermissionError:
        if os.name != "nt":
            raise
    except OSError:
        return

    subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
