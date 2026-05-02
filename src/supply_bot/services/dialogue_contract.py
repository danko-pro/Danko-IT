from __future__ import annotations

from dataclasses import dataclass

from supply_bot.services.dialogue_contract_prompt import DECISION_SYSTEM_PROMPT as DECISION_SYSTEM_PROMPT
from supply_bot.services.dialogue_contract_schema import DECISION_JSON_SCHEMA as DECISION_JSON_SCHEMA


@dataclass(slots=True)
class DialogueResult:
    text: str | None
