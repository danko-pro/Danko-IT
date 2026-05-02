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
    for violation in _collect_ui_contract_violations(relative_path, absolute_path, text):
        if violation is not None:
            violations[violation.violation_id] = violation
    return violations


def _collect_ui_contract_violations(
    relative_path: str,
    absolute_path: Path,
    text: str,
) -> tuple[UiMotionViolation | None, ...]:
    return (
        _details_with_js_height(relative_path, absolute_path, text),
        _css_details_height_transition(relative_path, absolute_path, text),
        _unscoped_form_control_css(relative_path, absolute_path, text),
        _flooring_techmap_raw_text_input(relative_path, absolute_path, text),
        _flooring_techmap_missing_compact_size(relative_path, absolute_path, text),
    )


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


def _unscoped_form_control_css(relative_path: str, absolute_path: Path, text: str) -> UiMotionViolation | None:
    if not relative_path.endswith(".css") or relative_path == "admin-ui/src/styles/components-forms.css":
        return None

    match = re.search(r"(?m)^\s*\.(?:text-input|text-input-compact|field-label|field-label-compact)\s*\{", text)
    if match is None:
        return None

    line_number = text.count("\n", 0, match.start()) + 1
    return UiMotionViolation(
        violation_id=f"form-control-single-source|{relative_path}|{line_number}",
        relative_path=relative_path,
        absolute_path=absolute_path,
        line_number=line_number,
        rule_name="form-control-single-source",
        severity="warn",
        message=(
            "Base form-control classes must be defined only in components-forms.css. "
            "Use scoped overrides or extend the shared Field/SelectField contract instead."
        ),
    )


def _flooring_techmap_raw_text_input(relative_path: str, absolute_path: Path, text: str) -> UiMotionViolation | None:
    if not _is_flooring_techmap_catalog(relative_path):
        return None
    match = re.search(r"<(?:input|select)\b[^>]*className=\{?['\"][^'\"]*\btext-input\b", text, flags=re.DOTALL)
    if match is None:
        return None
    line_number = text.count("\n", 0, match.start()) + 1
    return UiMotionViolation(
        violation_id=f"flooring-techmap-shared-fields|{relative_path}|{line_number}",
        relative_path=relative_path,
        absolute_path=absolute_path,
        line_number=line_number,
        rule_name="flooring-techmap-shared-fields",
        severity="warn",
        message="Flooring techmap forms should inherit shared TextField/SelectField instead of raw text-input markup.",
    )


def _flooring_techmap_missing_compact_size(relative_path: str, absolute_path: Path, text: str) -> UiMotionViolation | None:
    if not _is_flooring_techmap_catalog(relative_path):
        return None

    for match in re.finditer(r"<(?:TextField|SelectField)\b", text):
        tag_end = text.find("/>", match.start())
        if tag_end < 0:
            continue
        tag_text = text[match.start() : tag_end]
        if 'size="compact"' in tag_text:
            continue
        line_number = text.count("\n", 0, match.start()) + 1
        return UiMotionViolation(
            violation_id=f"flooring-techmap-compact-fields|{relative_path}|{line_number}",
            relative_path=relative_path,
            absolute_path=absolute_path,
            line_number=line_number,
            rule_name="flooring-techmap-compact-fields",
            severity="warn",
            message="Flooring techmap TextField/SelectField must use size=\"compact\" to keep dense calculator layout.",
        )
    return None


def _is_frontend_motion_candidate(relative_path: str) -> bool:
    return relative_path.startswith("admin-ui/src/") and relative_path.endswith((".tsx", ".css"))


def _is_flooring_techmap_catalog(relative_path: str) -> bool:
    return relative_path in {
        "admin-ui/src/features/calculator/flooring/covering.tsx",
        "admin-ui/src/features/calculator/flooring/prepare.tsx",
        "admin-ui/src/features/calculator/flooring/layout.tsx",
    }


def _line_number(text: str, needle: str) -> int:
    index = text.find(needle)
    if index < 0:
        return 1
    return text.count("\n", 0, index) + 1
