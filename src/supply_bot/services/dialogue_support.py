from __future__ import annotations

from supply_bot.services.dialogue_support_formatting import (
    NO_COMMENT_SENTINEL as NO_COMMENT_SENTINEL,
)
from supply_bot.services.dialogue_support_formatting import (
    DialogueSupportFormattingMixin,
)
from supply_bot.services.dialogue_support_parsing import DialogueSupportParsingMixin
from supply_bot.services.dialogue_support_variants import DialogueSupportVariantMixin


class DialogueSupportMixin(
    DialogueSupportVariantMixin,
    DialogueSupportParsingMixin,
    DialogueSupportFormattingMixin,
):
    pass
