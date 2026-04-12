from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class DialogFieldDefinition:
    code: str
    label: str
    question: str


DIALOG_FIELDS: dict[str, DialogFieldDefinition] = {
    "variant": DialogFieldDefinition(
        code="variant",
        label="Тип",
        question="Уточните, пожалуйста, какой именно вариант нужен?",
    ),
    "thickness_mm": DialogFieldDefinition(
        code="thickness_mm",
        label="Толщина",
        question="Какая толщина нужна?",
    ),
    "size": DialogFieldDefinition(
        code="size",
        label="Размер",
        question="Какой размер нужен?",
    ),
    "quantity": DialogFieldDefinition(
        code="quantity",
        label="Количество",
        question="Сколько нужно?",
    ),
    "comment": DialogFieldDefinition(
        code="comment",
        label="Комментарий",
        question="Есть ли комментарий по этой позиции?",
    ),
}

FIELD_ORDER: tuple[str, ...] = tuple(DIALOG_FIELDS)
UNIT_OPTIONS: tuple[str, ...] = ("лист", "мешок", "шт", "м2", "м.п.", "упак")

AFFIRMATIVE_WORDS = {
    "да",
    "ага",
    "ок",
    "окей",
    "хорошо",
    "хорош",
    "подойдет",
    "подойдёт",
    "давай",
    "принято",
    "понял",
    "верно",
    "подходит",
    "подтверждаю",
    "подтвердить",
    "согласен",
    "нормально",
}

NEGATIVE_WORDS = {
    "нет",
    "неа",
    "не подходит",
    "неверно",
    "исправить",
    "не согласен",
}

CANCEL_WORDS = {"отмена", "стоп", "сброс", "отменить"}
