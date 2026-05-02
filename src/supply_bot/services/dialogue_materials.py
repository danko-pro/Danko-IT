from __future__ import annotations

from supply_bot.services.dialogue_material_matching import (
    GENERIC_REQUEST_WORDS as GENERIC_REQUEST_WORDS,
)
from supply_bot.services.dialogue_material_matching import (
    DialogueMaterialMatchingMixin,
)
from supply_bot.services.dialogue_material_replies import DialogueMaterialReplyMixin


class DialogueMaterialsMixin(
    DialogueMaterialMatchingMixin,
    DialogueMaterialReplyMixin,
):
    pass
