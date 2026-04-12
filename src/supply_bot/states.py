from aiogram.fsm.state import State, StatesGroup


class FamilyCreateStates(StatesGroup):
    name = State()
    unit = State()
    fields = State()
    confirm = State()


class VariantCreateStates(StatesGroup):
    name = State()
    confirm = State()


class SkuCreateStates(StatesGroup):
    family = State()
    variant = State()
    title = State()
    article = State()
    brand = State()
    thickness = State()
    length = State()
    width = State()
    unit = State()
    confirm = State()


class AliasCreateStates(StatesGroup):
    value = State()
    confirm = State()


class SearchStates(StatesGroup):
    query = State()


class DeliverySettingsStates(StatesGroup):
    value = State()


class UnknownBindStates(StatesGroup):
    family = State()
