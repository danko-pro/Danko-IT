from __future__ import annotations

import argparse
from pathlib import Path

from .runtime import run_check, run_watch, start_guard, status_guard, stop_guard


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    root = Path(args.root).resolve()
    config_path = Path(args.config).resolve() if getattr(args, "config", None) else None

    if args.command == "check":
        return run_check(root, config_path)
    if args.command == "watch":
        return run_watch(root, config_path, args.interval)
    if args.command == "start":
        return start_guard(root, config_path, args.interval)
    if args.command == "stop":
        return stop_guard(root)
    if args.command == "status":
        return status_guard(root, emit_json=args.json)

    parser.error(f"Unsupported command: {args.command}")
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="architecture-guard",
        description=(
            "Standalone watcher that tracks file-size limits, checks layer boundaries and project topology, "
            "keeps a live list of violations, and warns when a saved file breaks a rule."
        ),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    _add_check_parser(subparsers)
    _add_watch_parser(subparsers)
    _add_start_parser(subparsers)
    _add_stop_parser(subparsers)
    _add_status_parser(subparsers)
    return parser


def _add_check_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("check", help="Run a single full scan and refresh the current oversized-file list.")
    _add_common_paths(parser)


def _add_watch_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("watch", help="Run the watcher in the foreground.")
    _add_common_paths(parser)
    parser.add_argument(
        "--interval",
        type=float,
        default=None,
        help="Override the polling interval in seconds.",
    )


def _add_start_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("start", help="Start the watcher in the background.")
    _add_common_paths(parser)
    parser.add_argument(
        "--interval",
        type=float,
        default=None,
        help="Override the polling interval in seconds.",
    )


def _add_stop_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("stop", help="Stop the background watcher.")
    parser.add_argument(
        "--root",
        default=".",
        help="Project root that contains the architecture guard config and runtime files.",
    )


def _add_status_parser(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("status", help="Show watcher status and current violation counts.")
    parser.add_argument(
        "--root",
        default=".",
        help="Project root that contains the architecture guard config and runtime files.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit the watcher status as JSON.",
    )


def _add_common_paths(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--root",
        default=".",
        help="Project root that contains the architecture guard config and tracked source files.",
    )
    parser.add_argument(
        "--config",
        default=None,
        help="Optional path to a custom architecture_guard.json file.",
    )
