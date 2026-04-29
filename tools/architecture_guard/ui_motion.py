from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class UiMotionViolation:
    violation_id: str
    relative_path: str
    absolute_path: Path
    line_number: int
    rule_name: str
    severity: str
    message: str


def collect_ui_motion_violations(relative_path: str, absolute_path: Path) -> dict[str, UiMotionViolation]:
    if not _is_frontend_motion_candidate(relative_path):
        return {}

    text = absolute_path.read_text(encoding="utf-8", errors="ignore")
    violations: dict[str, UiMotionViolation] = {}
    for violation in (
        _details_with_js_height(relative_path, absolute_path, text),
        _css_details_height_transition(relative_path, absolute_path, text),
    ):
        if violation is not None:
            violations[violation.violation_id] = violation
    return violations

def _details_with_js_height(relative_path: str, absolute_path: Path, text: str) -> UiMotionViolation | None:
    if not relative_path.endswith(".tsx") or "<details" not in text:
        return None
    has_measured_height = "ResizeObserver" in text and "getBoundingClientRect().height" in text
    has_inline_height = re.search(r"style=\{[^}]*height", text, flags=re.DOTALL) is not None
    if not has_measured_height and not has_inline_height:
        return None
    line_number = _line_number(text, "getBoundingClientRect().height" if has_measured_height else "style={")
    return UiMotionViolation(
        violation_id=f"expandable-motion-single-owner|{relative_path}|{line_number}",
        relative_path=relative_path,
        absolute_path=absolute_path,
        line_number=line_number,
        rule_name="expandable-motion-single-owner",
        severity="note",
        message=(
            "Expandable details should not compete with JS or inline height animation. "
            "Keep the active expandable content in document flow and let one motion owner control height."
        ),
    )


def _css_details_height_transition(relative_path: str, absolute_path: Path, text: str) -> UiMotionViolation | None:
    if not relative_path.endswith(".css") or "details" not in text:
        return None
    has_height_transition = "transition: height" in text or "transition: max-height" in text
    has_expandable_contract = "::details-content" in text or "grid-template-rows" in text
    if not has_height_transition or has_expandable_contract:
        return None
    line_number = _line_number(text, "transition: height" if "transition: height" in text else "transition: max-height")
    return UiMotionViolation(
        violation_id=f"expandable-motion-css-contract|{relative_path}|{line_number}",
        relative_path=relative_path,
        absolute_path=absolute_path,
        line_number=line_number,
        rule_name="expandable-motion-css-contract",
        severity="note",
        message=(
            "Details or accordion CSS uses height transition without an explicit expandable-height pattern. "
            "Prefer ::details-content, grid-template-rows, or another single-owner CSS motion contract."
        ),
    )


def _is_frontend_motion_candidate(relative_path: str) -> bool:
    return relative_path.startswith("admin-ui/src/") and relative_path.endswith((".tsx", ".css"))


def _line_number(text: str, needle: str) -> int:
    index = text.find(needle)
    if index < 0:
        return 1
    return text.count("\n", 0, index) + 1
