from __future__ import annotations

from typing import Any

# Общий helper для persistence-модулей estimates, которым нужно помечать проект обновлённым.


class EstimateProjectTouchStorageMixin:
    async def _touch_estimate_project(self, db: Any, project_id: int) -> None:
        await db.execute(
            """
            UPDATE estimate_projects
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (project_id,),
        )
