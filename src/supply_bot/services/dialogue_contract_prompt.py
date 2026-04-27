from __future__ import annotations

from supply_bot.services.dialogue_contract_prompt_part1 import DECISION_SYSTEM_PROMPT_PART_1
from supply_bot.services.dialogue_contract_prompt_part2 import DECISION_SYSTEM_PROMPT_PART_2
from supply_bot.services.dialogue_contract_prompt_part3 import DECISION_SYSTEM_PROMPT_PART_3

DECISION_SYSTEM_PROMPT = (
    DECISION_SYSTEM_PROMPT_PART_1
    + DECISION_SYSTEM_PROMPT_PART_2
    + DECISION_SYSTEM_PROMPT_PART_3
)
