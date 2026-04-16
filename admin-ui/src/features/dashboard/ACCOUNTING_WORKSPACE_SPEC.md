# Accounting Workspace

## Назначение

`Accounting Workspace` — это основной операционный экран объекта.
Он нужен не для обзорной карточки, а для плотного ежедневного учёта:

- плановых расходов;
- фактических расходов;
- счетов и актов;
- контрагентов и ответственных;
- сроков поставки и контрольных дат;
- статусов строки;
- быстрой финансовой и логистической аналитики по объекту.

Сейчас прототип живёт внутри `features/dashboard`, но целевая доменная зона для него — `features/projects`.

## Главные правила

1. Экран должен быть `table-first`, а не `card-first`.
2. Воздуха должно быть меньше, чем в обзорной карточке объекта.
3. Одна строка учёта — это отдельная бизнес-сущность.
4. Цвет кодирует смысл, а не просто украшает интерфейс.
5. `Счёт` и `Акт` не могут быть просто текстом.
6. Исходный файл счёта и акта обязателен.

## Структура экрана

### 1. Top Summary Strip

Верхняя плотная лента объекта должна показывать:

- `Договор`
- `Остаток 30%`
- `План`
- `Отложено`
- `Факт`
- `Работы / м²`
- `Материалы / м²`

Требования:

- одна линия;
- акцент на цифры;
- минимум вспомогательного текста;
- плотный ритм без крупных карточек.

### 2. Status Summary

Компактная правая сводка по состояниям объекта.
Она не заменяет таблицу, а даёт быстрый срез:

- `Счёт`
- `Ожидает оплаты`
- `Оплачено`
- `План`
- `Отложено`

### 3. Ledger Table

Это центральная часть страницы.
Таблица должна быть:

- плотной;
- легко сканируемой;
- рассчитанной на большое количество строк;
- пригодной для ежедневной работы, а не только для обзора.

## Колонки таблицы

Минимальный рабочий состав:

- `Категория / подстатья`
- `Контрагент / ответственный`
- `Статус`
- `Счёт`
- `Дата счёта`
- `Акт`
- `Дата акта`
- `Сумма`
- `Контроль`

Если позже потребуется больше детализации, `Контроль` может быть разложен на:

- `Дата поставки`
- `Дата оплаты`
- `Контрольная дата`

## Закон по документам

Это жёсткое правило:

- пользователь всегда загружает исходный файл счёта;
- пользователь всегда загружает исходный файл акта;
- текст в таблице вторичен;
- source file первичен.

Значит:

- строка не должна хранить просто `invoiceLabel`;
- строка не должна хранить просто `actLabel`;
- счёт и акт живут как отдельные сущности документа.

## Минимальная модель данных

```ts
type SourceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

type LedgerDocument = {
  id: string;
  kind: "invoice" | "act";
  title: string;
  date: string;
  amount: number;
  sourceFile: SourceFile;
  extractedByAi: boolean;
  verifiedByUser: boolean;
};

type ProjectLedgerEntry = {
  id: string;
  category: string;
  item: string;
  owner: string;
  counterparty: string;
  status: "planned" | "invoice" | "waiting-payment" | "paid" | "completed";
  invoiceDocument: LedgerDocument | null;
  actDocument: LedgerDocument | null;
  planAmount: number;
  actualAmount: number;
  controlDate: string;
};
```

## Поведение строки

Одна строка должна позволять:

- показать категорию и подстатью;
- показать ответственного и контрагента;
- показать текущий статус;
- показать наличие счёта;
- показать наличие акта;
- показать сумму;
- показать контрольную дату;
- в будущем открывать preview документов.

## Цветовая логика

Цвет должен кодировать:

- тип категории;
- статус строки;
- проблемность или срочность.

Примеры:

- `Материалы` — cyan/teal
- `Работы` — amber/yellow
- `Оплачено` — green
- `Счёт` — amber
- `План` — neutral
- `Просрочено / критично` — red

## Ограничения

- экран учёта не должен превращаться в набор крупных карточек;
- таблица остаётся главным центром внимания;
- документ без source file не считается подтверждённым;
- AI помогает с extraction, но не заменяет оригинал документа;
- вручную проверенные поля не должны silently затираться AI-обновлением.

## Текущее прототипирование

Пока допустимо держать экран внутри:

- `model/project-model.ts`
- `model/project-card.mock.ts`
- `accounting/project-accounting-summary-strip.tsx`
- `accounting/project-accounting-status-summary.tsx`
- `accounting/project-accounting-ledger-table.tsx`
- `accounting/project-accounting-workspace.tsx`
- `screen.tsx`

Целевое разбиение:

- `features/projects/model/accounting-types.ts`
- `features/projects/model/accounting-selectors.ts`
- `features/projects/state/accounting-controller.ts`
- `features/projects/detail/summary-strip.tsx`
- `features/projects/detail/status-summary.tsx`
- `features/projects/detail/ledger-table.tsx`
- `features/projects/detail/ledger-row.tsx`
- `features/projects/detail/document-cell.tsx`
- `features/projects/detail/document-preview.tsx`

## Порядок реализации

1. Собрать верхнюю `summary strip`.
2. Собрать `status summary`.
3. Перестроить таблицу под реальные колонки.
4. Вынести документные сущности `invoice/act`.
5. Добавить обязательный upload исходника.
6. Добавить preview и открытие документов.
7. Подключить AI extraction как вспомогательный слой.

## Чеклист

- есть верхняя summary strip;
- есть плотная таблица;
- у строки есть статус;
- у строки есть счёт как документ;
- у строки есть акт как документ;
- у счёта есть source file;
- у акта есть source file;
- исходник можно открыть;
- AI не заменяет source file;
- карточка объекта и accounting workspace остаются разными экранами.

## OCR Preview Roadmap

Для `Счёта` и `Акта` нужен отдельный слой preview по hover на иконку глаза.

Правило:

- OCR и document extraction не запускаются на каждом наведении;
- OCR выполняется на backend после загрузки файла или по явному действию;
- результат сохраняется вместе с документом;
- hover в UI показывает уже готовую сводку, а не запускает тяжёлую обработку заново.

Минимальный состав preview:

- распознанный текст;
- ключевые поля: номер, дата, сумма, контрагент;
- confidence / статус проверки;
- признак, что данные подтверждены менеджером.

Целевая структура:

- `project_ledger_documents` хранит metadata и source file;
- отдельный OCR/extraction result хранится как server-side сущность;
- `document-preview` в UI читает только готовый payload.

Следующий шаг после базового upload/download:

1. добавить иконку глаза в ячейку документа;
2. сделать hover-popover preview;
3. добавить backend payload для OCR summary;
4. потом подключить AI extraction для фото и сканов.
