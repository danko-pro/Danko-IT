from __future__ import annotations

import json
from typing import Any


def extract_content(payload: dict[str, Any]) -> str | None:
    choices = payload.get("choices") or []
    if not choices:
        return None
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        fragments: list[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                fragments.append(str(chunk.get("text", "")))
        text = "".join(fragments).strip()
        return text or None
    return None


def extract_json_content(payload: dict[str, Any]) -> dict[str, Any] | None:
    content = extract_content(payload)
    if not content:
        return None
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def extract_responses_text(payload: dict[str, Any]) -> str | None:
    """Достает текст из ответа OpenAI Responses API."""
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    fragments: list[str] = []
    for output_item in payload.get("output") or []:
        if not isinstance(output_item, dict):
            continue
        for content_item in output_item.get("content") or []:
            if not isinstance(content_item, dict):
                continue
            if content_item.get("type") in {"output_text", "text"}:
                fragments.append(str(content_item.get("text") or ""))

    text = "".join(fragments).strip()
    return text or None


def normalize_decision_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    actions_in = payload.get("actions")
    actions_out: list[dict[str, Any]] = []
    if isinstance(actions_in, list):
        for action in actions_in:
            if not isinstance(action, dict):
                continue
            action_type = action.get("type") or action.get("action")
            if not isinstance(action_type, str) or not action_type.strip():
                continue
            normalized_action = dict(action)
            normalized_action["type"] = action_type.strip()
            actions_out.append(normalized_action)

    confidence = payload.get("confidence")
    try:
        confidence_value = float(confidence)
    except (TypeError, ValueError):
        confidence_value = 0.0

    missing_branches = payload.get("missing_branches")
    if not isinstance(missing_branches, list):
        missing_branches = []

    reply_text = payload.get("reply_text")
    if not isinstance(reply_text, str):
        reply_text = ""

    intent = payload.get("intent")
    if not isinstance(intent, str) or not intent.strip():
        intent = "unknown"

    notes = payload.get("notes")
    if not isinstance(notes, str):
        notes = ""

    loop_detected = payload.get("loop_detected")
    if not isinstance(loop_detected, bool):
        loop_detected = False

    ready_for_confirmation = payload.get("ready_for_confirmation")
    if not isinstance(ready_for_confirmation, bool):
        ready_for_confirmation = False

    return {
        "reply_text": reply_text.strip(),
        "intent": intent.strip(),
        "confidence": max(0.0, min(1.0, confidence_value)),
        "loop_detected": loop_detected,
        "actions": actions_out,
        "missing_branches": [str(branch) for branch in missing_branches],
        "ready_for_confirmation": ready_for_confirmation,
        "notes": notes.strip(),
    }
