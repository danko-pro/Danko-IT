from __future__ import annotations

from supply_bot.services.dialogue_request_flow_delivery import DialogueRequestFlowDeliveryMixin
from supply_bot.services.dialogue_request_flow_items import DialogueRequestFlowItemMixin
from supply_bot.services.dialogue_request_flow_summary import DialogueRequestFlowSummaryMixin


class DialogueRequestFlowMixin(
    DialogueRequestFlowItemMixin,
    DialogueRequestFlowDeliveryMixin,
    DialogueRequestFlowSummaryMixin,
):
    pass
