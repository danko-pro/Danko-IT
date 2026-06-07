from __future__ import annotations

import sys
from pathlib import Path

from tools.project_guard import require_project_guard

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from supply_bot.admin_api.app import main  # noqa: E402

if __name__ == "__main__":
    if require_project_guard("admin-api") != 0:
        raise SystemExit(1)
    main()
