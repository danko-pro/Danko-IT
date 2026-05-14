# Phase 7A: Google Sheets -> Site Calculator Gap Map

Дата анализа: 2026-05-14.

Источник Google Sheet: `КП от «14» апреля 2026 г.`.

URL: `https://docs.google.com/spreadsheets/d/1PWoIgBbEC10g7DKAV2LVIZBywcEvx3TaJBMqtmBUuV4`.

Цель документа: сравнить текущий калькулятор сайта с логикой Google Sheet и зафиксировать архитектурную карту переноса без изменения runtime-кода.

## 1. Executive summary

На сайте уже реализован production-ready calculator runtime для базового проектного контура: объект сметы, помещения, геометрия помещений, проемы, теплый пол, напольные покрытия, отделка стен и двери.

Backend уже переведен на SQLAlchemy/Postgres-ready estimates repositories. Frontend калькулятора уже разделен на stage-структуру и отдельные модули. Базовая геометрия помещений вынесена в domain layer: `src/supply_bot/estimates/domain/room_geometry.py`.

Google Sheet шире текущего сайта. Кроме уже частично покрытых блоков теплого пола, напольных покрытий, отделки стен и дверей, в таблице есть отдельные расчетные и коммерческие блоки для потолков, электрики, сантехники, финишного клининга, кухни, бытовой техники, мебели, текстиля, декора, КП-сметы, спецификации и AI-инструкций.

Первыми нужно переносить самостоятельные расчетные модули, которые имеют понятные справочники и не требуют смешивания с КП-генератором. Лучший первый кандидат: `Потолки`, потому что лист `Пот v1` является справочником позиций с понятной структурой, а расчетные строки в `Расчет` уже используют потолочные позиции.

Нельзя смешивать текущий калькулятор с генерацией КП, AI-текстами, наценкой, маржой и клиентским описанием. Источник истины должен оставаться структурированным расчетным payload, а КП и AI-тексты должны быть отдельным document-generation слоем.

Изученные листы Google Sheet: `Формулы`, `Расчет`, `СТ v2`, `ТП v1`, `НП v1`, `НП v2`, `СТ v1`, `Эл v1`, `Сан v1`, `КП смета`, `Служебный`, `ГКЛ`, `Спецификация`, `Пот v1`, `Справочник (НП)`, `Справочник (Потолок)`, `Справочник (Электрика)`, `Материалы`, `Справочник (ОК)`.

## 2. Current site calculator coverage

| Модуль сайта | Где лежит в frontend | Где лежит в backend | Какие данные хранит | Какой раздел Google Sheet покрывает | Статус |
|---|---|---|---|---|---|
| estimate project | `admin-ui/src/features/calculator/project`, `admin-ui/src/features/calculator/app/project.ts` | `src/supply_bot/admin_api/calculator_routes/core.py`, `src/supply_bot/storage_estimates/repository.py` | Объект расчета, контакты, настройки проекта, связь с workspace | `Расчет`, частично `КП смета` | implemented |
| rooms | `admin-ui/src/features/calculator/rooms`, `admin-ui/src/features/calculator/room` | `calculator_routes/core.py`, `storage_estimates/repository.py`, `storage_estimates/rooms.py` | Помещения, высота, сортировка, стены, участки пола | `Расчет`, `Формулы` | implemented |
| room geometry | `admin-ui/src/features/calculator/room/calc.ts`, `room/stats.tsx` | `src/supply_bot/estimates/domain/room_geometry.py`, `calculator_payloads/core.py` | Площадь пола, периметр, площадь стен, проемы, двери, net wall area | `Расчет`, `Формулы` | implemented |
| openings | `admin-ui/src/features/calculator/room/openings.tsx`, `opening-card.tsx` | `storage_estimates/repository.py`, `estimate_room_openings` | Окна, ниши, ручная площадь или ширина/высота/количество | `Расчет` | implemented |
| warm-floor | `admin-ui/src/features/calculator/warm-floor` | `calculator_routes/warm_floor.py`, `calculator_payloads/warm_floor.py`, `storage_estimates/warm_floor_repository.py` | Конфиг теплого пола, комнаты, трубы, коллектор, насос, материалы | `ТП v1` | partial |
| flooring | `admin-ui/src/features/calculator/flooring` | `calculator_routes/flooring.py`, `calculator_payloads/flooring*.py`, `storage_estimates/flooring_repository.py` | Покрытия, подготовки, раскладки, комнаты, зоны, расходники | `НП v1`, `НП v2`, `Справочник (НП)` | partial |
| wall-finish | `admin-ui/src/features/calculator/wall-finish` | `calculator_routes/wall_finish.py`, `calculator_payloads/wall_finish*.py`, `storage_estimates/wall_finish_repository.py` | Настенные покрытия, подготовка, раскладки, зоны, техкарта | `СТ v1`, `СТ v2` | partial |
| doors | `admin-ui/src/features/calculator/doors`, `doors-workbench` | `calculator_routes/doors.py`, `calculator_payloads/doors.py`, `storage_estimates/doors_repository.py` | Каталог дверей, проектные двери, компоненты, связи комнат | Дверные блоки в `Расчет`, частично `Служебный` | partial |
| commercial proposal | `admin-ui/src/features/calculator/project/kp.tsx` | Нет выделенного production слоя КП-генерации | Сейчас скорее UI-заготовка, не полноценный генератор КП | `КП смета`, `Спецификация` | missing |
| ceilings | Нет stage | Нет route/payload/repository | Нет | `Пот v1`, `Справочник (Потолок)`, строки потолков в `Расчет` | missing |
| electrical | Нет stage | Нет route/payload/repository | Нет | `Эл v1`, `Справочник (Электрика)`, строки электрики в `Расчет` | missing |
| plumbing | Нет stage | Нет route/payload/repository | Нет | `Сан v1`, `Материалы`, строки сантехники в `Расчет` | missing |
| completion packages | Нет stage | Нет route/payload/repository | Нет | `КП смета`, `Спецификация` | missing |

Существующие SQLAlchemy таблицы estimates runtime: `estimate_projects`, `estimate_rooms`, `estimate_room_walls`, `estimate_room_floor_sections`, `estimate_room_openings`, `estimate_warm_floor_configs`, `estimate_warm_floor_rooms`, `estimate_flooring_configs`, `estimate_flooring_coverings`, `estimate_flooring_preparations`, `estimate_flooring_layouts`, `estimate_flooring_rooms`, `estimate_flooring_room_zones`, `estimate_wall_finish_configs`, `estimate_wall_finish_coverings`, `estimate_wall_finish_preparations`, `estimate_wall_finish_layouts`, `estimate_wall_finish_rooms`, `estimate_wall_finish_room_zones`, `estimate_door_catalog`, `estimate_project_doors`, `estimate_door_component_catalog`, `estimate_project_door_components`.

## 3. Google Sheet modules inventory

| Лист / раздел Google Sheet | Что считает | Какие входные данные нужны | Какие справочники использует | Какие итоговые данные формирует | Есть ли аналог на сайте | Комментарий по переносу |
|---|---|---|---|---|---|---|
| `Расчет` | Центральная расчетная матрица: площади полов, стен, проемов, теплый пол, НП, стены, сантехника, электрика, потолки, агрегаты для КП | Помещения, площади, периметры, выбранные позиции, чекбоксы включения, коэффициент | `ТП v1`, `НП v2`, `СТ v1`, `Сан v1`, `Эл v1`, `Пот v1`, `Служебный` | Суммы по разделам, объемы, материалы, работы, данные для КП | partial | На сайте нельзя переносить этот лист как один монолит. Нужно разобрать по доменам. |
| `Формулы` | Поясняет формулы поиска помещений и исключения двойного учета | Названия помещений, диапазоны площадей | Концептуально лист `Помещения`, в текущей книге отдельного листа нет | Правила matching помещений | partial | Логику matching нужно выразить в domain functions и tests, не в payload builders. |
| `ТП v1` | Теплый пол: площадь, труба, контуры, коллектор, насос, работы и материалы | Площадь комнат, включенные комнаты, параметры контуров, стоимость работ и материалов | Внутренние константы листа и данные `Расчет` | Итого работы, материалы, спецификация теплого пола | partial | На сайте уже есть warm-floor, но нужна сверка формул и snapshots. |
| `НП v1` | Старый расчет напольных покрытий | Площадь, периметр, запас, подложка, плинтус, порожки, демонтаж, подготовка | Внутренние ставки | Работы, материалы, итог по НП | partial | Учитывать только как legacy reference, основной источник ближе к `НП v2`. |
| `НП v2` | Новый расчет напольных покрытий и текстовые блоки для спецификации | Комнаты, покрытия, раскладки, подготовки, расходники, зоны | `Справочник (НП)`, `Спецификация`, `Расчет` | Смета НП, материалы, работы, текстовые блоки | partial | На сайте уже есть flooring, но текстовые генераторы и КП-часть должны быть отдельно. |
| `Справочник (НП)` | Пакеты напольных покрытий MIN/MID/MAX, материалы, работы, тексты | Тип пакета, цены материалов, цены работ, расходники | Внутренние строки справочника | Дефолтные каталоги и описания пакетов | partial | На сайте есть catalogs, но нужны импортируемые global defaults и pricing snapshots. |
| `СТ v1` | Отделка стен: покрытия, подготовка, плитка, декоративные элементы | Площади стен, зоны, типы покрытий, подготовка, доп. элементы | `Расчет`, внутренние ставки | Суммы работ и материалов по стенам | partial | На сайте есть wall-finish, но нужна сверка справочников, доп. элементов и текстов. |
| `СТ v2` | Сводная спецификация отделки стен поверх `СТ v1` | Данные `СТ v1` | `СТ v1` | Группировка работ и материалов | partial | Это ближе к read-model/spec generation, не к интерактивному калькулятору. |
| `Пот v1` | Справочник потолочных позиций: натяжные потолки, профили, ниши, закладные, свет, люки, обходы | Площадь потолков, периметры/м.п., количество точек и доп. элементов | Внутренние позиции `PT-*` | Стоимость работ, материалов, оборудования, расходников | missing | Лучший первый кандидат на перенос после Phase 7A. |
| `Справочник (Потолок)` | Пакеты потолков MIN/MID/MAX и клиентские описания | Выбранный пакет, площадь, доп. условия | Внутренние ставки и описания | Пакетные цены и текстовые описания | missing | Нужен как global defaults для ceilings, не как runtime formula. |
| `Эл v1` | Справочник электрических точек и работ: розетки, выводы, кухонные линии, свет | Количество точек, группы, помещения, выбранные позиции | Внутренние позиции `EL-*` | Работы, материалы, оборудование, расходники | missing | Переносить после потолков, потому что больше связей с помещениями и сценариями. |
| `Справочник (Электрика)` | Пакеты электрики MIN/MID/MAX, люстры, точки, работы, клиентские описания | Пакет, площадь/количество, лимиты точек | Внутренние строки пакетов | Пакетные суммы и описание уровня работ | missing | Нужен отдельный catalog/defaults слой плюс snapshot цен. |
| `Сан v1` | Сантехника: точки ХВС/ГВС/канализации, оборудование, расходники, работы | Сантехнические позиции, количество, помещения, оборудование | `Материалы`, внутренние позиции | Стоимость сантехники по материалам, работам, оборудованию | missing | Сложнее потолков и электрики из-за equipment/material catalog. |
| `Материалы` | Товарные позиции сантехники и оборудования, цены, расчет площади по названию | Название товара, цена, размер, поставщик | Внутренние товарные строки | Справочные цены и параметры | partial | В проекте есть общий catalog/materials, но calculator-specific material source отсутствует. |
| `КП смета` | Коммерческая смета и приложение к договору | Суммы из расчетных листов, коэффициент, адрес, объект, сроки, разделы КП | `Расчет`, `СТ v1`, коэффициент `CB18` | Клиентский документ с продажными суммами | missing | Должен стать отдельным commercial proposal module, не частью calculator_payloads. |
| `Спецификация` | AI-инструкции и технические блоки для клиентского текста | Structured calculation outputs, итоговые суммы, стиль текста | `КП смета`, `Расчет`, `НП v2`, `СТ v1`, `Сан v1` | Технический payload для AI и client-facing текст | missing | AI-текст не должен быть источником истины. |
| `Служебный` | Списки помещений, пакеты, служебные справочники, derived lists | Справочники, названия помещений, пакетные значения | `Справочник (НП)`, старые справочники, внутренние ranges | Lookup-значения для dropdown и formulas | partial | Переносить как seed/defaults и lookup tables, не как runtime-лист. |
| Финишный клининг в `КП смета` | Текстовый и коммерческий раздел финишной уборки | Площадь, состав работ, package selection | Встроенный блок `КП смета` | Раздел КП | missing | Относится к completion packages, не к базовому калькулятору. |
| Кухня в `КП смета` / `Расчет` | Упоминается как помещение и как пакет комплектации | Помещение, состав кухни, оборудование, мебель | `КП смета`, possibly completion rows | Коммерческий раздел комплектации | missing | Нельзя смешивать с flooring/walls. Нужен отдельный completion stage. |
| Бытовая техника в `КП смета` | Упоминается вместе с мебелью/кухней | Список техники, цена, количество, пакет | КП package rows | Коммерческий раздел комплектации | missing | Нужны item snapshots и отдельный package repository. |
| Мебель в `КП смета` | Раздел `МЕБЕЛЬ И ПРЕДМЕТЫ ИНТЕРЬЕРА` | Список мебели, помещения, количество, цена | КП package rows | Коммерческий раздел комплектации | missing | Completion module, не construction calculator. |
| Текстиль и декор в `КП смета` | Раздел `ТЕКСТИЛЬ И ДЕКОРАТИВНОЕ ОФОРМЛЕНИЕ` | Шторы, тюль, декор, рейки, комнаты | КП package rows | Коммерческий раздел комплектации | missing | Completion module с отдельными item categories. |

## 4. Missing modules

### A. Calculation modules

| Модуль | Статус | Почему отсутствует | Что нужно для переноса |
|---|---|---|---|
| ceiling / Потолки | missing | Нет frontend stage, route, payload, repository, tables | `estimate_ceiling_*` entities, domain расчет, catalogs, stage `ceilings` |
| electrical / Электрика | missing | Нет модели точек, групп, щитка, световых сценариев | `estimate_electrical_*` entities, catalogs `EL-*`, stage `electrical` |
| plumbing / Сантехника | missing | Нет модели сантехнических точек, equipment, ХВС/ГВС/канализации | `estimate_plumbing_*` entities, material/equipment snapshots, stage `plumbing` |

### B. Completion / package modules

| Модуль | Статус | Природа данных | Что нужно для переноса |
|---|---|---|---|
| cleaning | missing | Пакет работ финишной уборки из КП | `estimate_completion_packages` или отдельный `cleaning_items` позже |
| kitchen | missing | Комплектация кухни, не строительный расчет | `estimate_kitchen_items`, pricing snapshots |
| appliances | missing | Бытовая техника, позиции и цены | `estimate_appliance_items`, vendor/source fields |
| furniture | missing | Мебель и предметы интерьера | `estimate_furniture_items`, room/package linkage |
| textile/decor | missing | Текстиль, шторы, декор, рейки | `estimate_textile_items`, category snapshots |

### C. Document generation

| Модуль | Статус | Где в Sheet | Где должен жить на сайте |
|---|---|---|---|
| commercial proposal | missing | `КП смета` | `commercial_proposals` + отдельный backend service, не `calculator_payloads` |
| contract appendix | missing | `КП смета`, приложение к договору | document generation layer поверх structured payload |
| AI section text generation | missing | `Спецификация` | generation rules + prompts/templates, не frontend |
| technical payload -> client text | missing | `Спецификация` D:G/H columns | structured calculation payload -> proposal sections |

## 5. Proposed transfer phases

| Phase | Цель | Что переносится из Google Sheet | Backend entities | Frontend stages | Tests | Риски |
|---|---|---|---|---|---|---|
| Phase 7B: ceilings calculator | Добавить потолки как первый новый модуль | `Пот v1`, `Справочник (Потолок)`, потолочные строки `Расчет` | `estimate_ceiling_configs`, `estimate_ceiling_rooms`, `estimate_ceiling_items` | `ceilings` | repository isolation, domain formulas, route smoke, frontend save/load | Перепутать package descriptions с расчетом; забыть snapshots |
| Phase 7C: electrical calculator | Добавить электрику как расчет точек и групп | `Эл v1`, `Справочник (Электрика)`, строки электрики `Расчет` | `estimate_electrical_configs`, `estimate_electrical_points`, `estimate_electrical_groups` | `electrical` | points/groups, owner isolation, totals, package defaults | Много типов точек, сценарии освещения, kitchen-specific lines |
| Phase 7D: plumbing calculator | Добавить сантехнику и оборудование | `Сан v1`, `Материалы`, строки сантехники `Расчет` | `estimate_plumbing_configs`, `estimate_plumbing_points` | `plumbing` | points, equipment snapshots, totals, isolation | Смешивание работ, материалов, оборудования, vendor prices |
| Phase 7E: completion packages | Добавить коммерческие пакеты комплектации | Разделы `КП смета`: cleaning, kitchen, appliances, furniture, textile/decor | `estimate_completion_packages`, `estimate_kitchen_items`, `estimate_appliance_items`, `estimate_furniture_items`, `estimate_textile_items` | `completion` | item CRUD, totals, snapshots, proposal source payload | Это не строительный расчет, нельзя смешать с rooms modules |
| Phase 7F: commercial proposal / contract appendix generation | Сформировать КП и приложение из structured payload | `КП смета` | `commercial_proposals`, `commercial_proposal_sections` | `proposal` | generated sections from saved payload, immutable totals, access control | Риск утечки маржи/коэффициентов в клиентский текст |
| Phase 7G: AI text generation rules | Перенести правила генерации клиентского текста | `Спецификация` | `commercial_proposal_generation_rules` | `proposal` settings/review | prompt/rules tests, no source-of-truth mutation, regression snapshots | AI может исказить суммы или добавить запрещенные детали |

## 6. Data model draft

Это архитектурный draft. На Phase 7A миграции не создаются.

| Entity | Зачем нужна | `owner_user_id` | Global defaults | Связь с `estimate_project_id` |
|---|---|---|---|---|
| `estimate_ceiling_configs` | Настройки потолочного расчета проекта | required for user project configs | no | `estimate_project_id` required |
| `estimate_ceiling_rooms` | Потолочные настройки по помещению: тип потолка, площадь, периметр, включение | required | no | required, plus `room_id` |
| `estimate_ceiling_items` | Позиции потолков: профили, ниши, закладные, свет, обходы | required for project items | yes for catalog/default positions | required for project item rows |
| `estimate_electrical_configs` | Настройки электрики проекта: пакет, коэффициенты, режим расчета | required | no | required |
| `estimate_electrical_points` | Электрические точки: розетки, выводы, свет, приборы | required for project points | yes for catalog defaults | required, optional `room_id` |
| `estimate_electrical_groups` | Группы электрики: щит, линии, сценарии, мокрые зоны | required | yes for default group templates | required |
| `estimate_plumbing_configs` | Настройки сантехнического расчета | required | no | required |
| `estimate_plumbing_points` | Сантехнические точки и оборудование: ХВС, ГВС, канализация, приборы | required for project points | yes for catalog defaults | required, optional `room_id` |
| `estimate_completion_packages` | Коммерческие пакеты комплектации: клининг, кухня, мебель, техника, декор | required for user selected packages | yes for package templates | required |
| `estimate_kitchen_items` | Позиции кухни и кухонной комплектации | required | yes for default catalog | required, optional `room_id` |
| `estimate_appliance_items` | Бытовая техника | required | yes for default catalog | required, optional `room_id` |
| `estimate_furniture_items` | Мебель и предметы интерьера | required | yes for default catalog | required, optional `room_id` |
| `estimate_textile_items` | Текстиль, шторы, декор | required | yes for default catalog | required, optional `room_id` |
| `commercial_proposals` | Сохраненный КП-документ с версией payload и статусом | required | no | required |
| `commercial_proposal_sections` | Разделы КП: стены, полы, сантехника, электрика, потолки, completion | required | optional section templates only outside project rows | required through proposal |
| `commercial_proposal_generation_rules` | Правила генерации текста, AI-инструкции, запреты, стиль | optional for global rules, owner for custom rules | yes | no direct project requirement |

Ключевое правило: все пользовательские расчетные строки должны иметь `owner_user_id`. Global defaults допустимы только для справочников и шаблонов, где `owner_user_id = NULL`.

Ключевое правило по старым сметам: расчетные позиции должны хранить snapshots названия, единицы, цены, категории, source reference и расчетных параметров. Изменение справочника не должно менять уже сохраненную смету.

## 7. UI mapping

Текущий визуальный стиль калькулятора нужно сохранять. Новый UI с нуля не проектировать.

Текущие stages: `project`, `rooms`, `warmfloor`, `flooring`, `wallfinish`, `doors`.

Предлагаемые будущие stages:

| Stage | Назначение | Как ложится в текущую структуру |
|---|---|---|
| `ceilings` | Потолки по помещениям, потолочные позиции, закладные, ниши, свет | Аналог `flooring`/`wallfinish`: rooms panel, catalog panel, summary/spec panel |
| `electrical` | Электрические точки, группы, сценарии, силовые линии | Аналог `doors` для точек плюс summary по группам |
| `plumbing` | Сантехнические точки, оборудование, ХВС/ГВС/канализация | Аналог item catalog + room binding |
| `completion` | Клининг, кухня, техника, мебель, текстиль, декор | Отдельный коммерческий stage, не room geometry stage |
| `proposal` | Предпросмотр КП, секции, генерация приложения | Read-only/review stage поверх saved calculation payload |

Frontend placement по текущей архитектуре:

| Новый stage | Будущая папка frontend | Основание |
|---|---|---|
| `ceilings` | `admin-ui/src/features/calculator/ceilings` | Повторить паттерн `flooring` и `wall-finish` |
| `electrical` | `admin-ui/src/features/calculator/electrical` | Отдельная модель точек и групп |
| `plumbing` | `admin-ui/src/features/calculator/plumbing` | Отдельная модель сантехнических позиций |
| `completion` | `admin-ui/src/features/calculator/completion` | Package/items flow |
| `proposal` | `admin-ui/src/features/calculator/proposal` | Preview/review/generation flow |

Backend placement по текущей архитектуре:

| Новый модуль | Будущие backend areas |
|---|---|
| ceilings | `storage_estimates/ceiling_repository.py`, `admin_api/calculator_routes/ceilings.py`, `admin_api/calculator_payloads/ceilings.py`, `estimates/domain/ceiling.py` |
| electrical | `storage_estimates/electrical_repository.py`, `calculator_routes/electrical.py`, `calculator_payloads/electrical.py`, `estimates/domain/electrical.py` |
| plumbing | `storage_estimates/plumbing_repository.py`, `calculator_routes/plumbing.py`, `calculator_payloads/plumbing.py`, `estimates/domain/plumbing.py` |
| completion | `storage_estimates/completion_repository.py`, `calculator_routes/completion.py`, `calculator_payloads/completion.py` |
| proposal | Новый слой вне `calculator_payloads`, например `commercial_proposals/` или `documents/proposals/` |

## 8. Business rules and risks

Нельзя упоминать коэффициент, наценку, маржу, себестоимость, внутреннюю закупочную цену и внутреннюю логику продаж в клиентском тексте.

Старые сметы не должны пересчитываться задним числом при изменении справочников.

Нужны pricing snapshots для всех позиций, которые попали в смету: название, единица, цена материала, цена работы, цена оборудования, расходники, коэффициент, source catalog id, source sheet/version.

AI-generated text не должен быть источником истины.

Источник истины - structured calculation payload из Postgres.

КП-генератор не должен жить внутри `calculator_payloads`.

Расчетные формулы не должны жить во frontend.

Frontend может показывать preview, но backend/domain layer должен отвечать за итоговый расчет и сохранение.

`КП смета` содержит коэффициент и клиентский документ. Его нельзя переносить как один backend payload builder.

`Спецификация` содержит AI-инструкции и текстовые шаблоны. Ее нужно переносить позже, после structured modules.

`Служебный` содержит lookup и dropdown-данные. Его нужно разложить на seed data и catalog defaults.

Completion modules нельзя смешивать с construction modules. Кухня, техника, мебель, текстиль и декор - это комплектация, а не геометрия/строительный расчет.

Потолки, электрика и сантехника должны хранить не только итоговые суммы, но и технические позиции, чтобы КП можно было пересобрать без потери деталей.

## 9. Immediate next recommendation

Следующий recommended phase: `Phase 7B: ceilings calculator`.

Почему первым переносить потолки:

- `Пот v1` имеет чистую справочную структуру: `ID`, позиция, группа, единица, работа, материал, оборудование, расходники, коэффициент, комментарий.
- Потолки меньше связаны с внешними material/equipment каталогами, чем сантехника.
- Потолки менее сложны по группам и сценариям, чем электрика.
- В `Расчет` уже есть потолочный блок с позициями вроде натяжного потолка, светодиодной подсветки, парящего профиля и ниш под шторы.
- `Справочник (Потолок)` дает package defaults MIN/MID/MAX, которые можно импортировать как global defaults.

Файлы, которые трогать в следующей фазе:

| Область | Файлы / будущие файлы |
|---|---|
| schema | `migrations/versions/0007_create_estimate_ceilings.py`, `src/supply_bot/storage_estimates/tables.py` |
| repository | `src/supply_bot/storage_estimates/ceiling_repository.py` |
| domain | `src/supply_bot/estimates/domain/ceiling.py` |
| payload | `src/supply_bot/admin_api/calculator_payloads/ceilings.py` |
| routes | `src/supply_bot/admin_api/calculator_routes/ceilings.py` |
| frontend | `admin-ui/src/features/calculator/ceilings/*`, stage registry/header options |
| tests | `tests/test_storage_estimates_ceiling_repository.py`, `tests/test_estimate_ceiling_domain.py`, calculator route smoke tests |

Файлы, которые не трогать в следующей фазе:

| Не трогать | Причина |
|---|---|
| `calculator_payloads/core.py` | Не превращать общий payload в новый монолит |
| `commercial proposal` слой | КП переносится только после structured modules |
| `Спецификация` AI rules | AI rules переносятся в Phase 7G |
| `electrical` и `plumbing` runtime | Это Phase 7C и Phase 7D |
| `completion` packages | Это Phase 7E |
| frontend redesign | UI должен расширяться текущим stage pattern |

Итог: Phase 7A показывает, что сайт закрывает базовый calculator runtime, но Google Sheet содержит еще три крупных расчетных домена и отдельный document-generation контур. Перенос нужно продолжать с потолков, затем электрика, сантехника, completion packages, КП и AI rules.
