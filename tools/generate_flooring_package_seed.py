"""Print deterministic package-first flooring-v2 local seed JSON (PF3)."""

from __future__ import annotations

import json
import sys

from supply_bot.estimates.application.flooring_snapshot import build_flooring_v2_local_package_seed


def main() -> int:
    payload = build_flooring_v2_local_package_seed()
    output_path = sys.argv[1] if len(sys.argv) > 1 else None
    if output_path:
        with open(output_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
    else:
        json.dump(payload, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
