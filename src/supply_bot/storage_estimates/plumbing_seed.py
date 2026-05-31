from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from supply_bot.storage_estimates.tables import (
    estimate_plumbing_catalog_items,
    estimate_plumbing_zone_items,
    estimate_plumbing_zone_package_items,
    estimate_plumbing_zone_packages,
    estimate_plumbing_zones,
)

# Идемпотентный seed глобальных дефолтов каталога сантехники (owner_user_id = NULL).
#
# Источник значений — admin-ui/src/features/catalog-editor/plumbing-seed.ts
# (PLUMBING_SEED + ZONES_SEED). TS не импортируется в Python, поэтому числа перенесены
# вручную в том же порядке аргументов, что у TS-хелпера row():
#   row(id, publicTitle, technicalTitle, unit, works, materials, consumables, equipment, group, source)
# Цены/коэффициенты/составы должны ТОЧНО совпадать с TS — это критично для парити снапшота.

# --- Константы зон (1:1 с plumbing-seed.ts) ---

WATER_POINT_FITTINGS_QTY = 6
PIPE_CLAMP_PER_METER = 1.5
ZONE_GROOVE_METERS_DEFAULT = 6
SINK_ZONE_GROOVE_METERS = ZONE_GROOVE_METERS_DEFAULT
SHOWER_ZONE_PPR_METERS = 20
SHOWER_ZONE_SEWER_METERS = 3
SHOWER_ZONE_GROOVE_METERS = ZONE_GROOVE_METERS_DEFAULT
INSTALL_RELOCATION_PPR_METERS = 15
INSTALL_RELOCATION_SEWER_METERS = 2
INSTALL_RELOCATION_GROOVE_METERS = 8
DISHWASHER_ZONE_PPR_METERS = 10
DISHWASHER_ZONE_SEWER_METERS = 2
DISHWASHER_ZONE_GROOVE_METERS = 4
# A8.2: фиксированное количество отсечных кранов в зоне «Сантехнический узел».
# Раньше в плоской опции includeWaterNode было max(4, ХВС+ГВС точек) — зависело от остальной сметы;
# в зональной модели фиксируем на минимуме 4 (намеренный детерминированный итог зоны).
WATER_NODE_SHUTOFF_VALVES_QTY = 4
DEFAULT_ZONE_RISK_PERCENT = 6.4


def _pipe_clamp_qty(pipe_meters: float) -> float:
    return pipe_meters * PIPE_CLAMP_PER_METER


# Миграция старых id (economy/standard/comfort и локальные id редактора) → канонические seed-id.
# Эталон — LEGACY_ATOMIC_ITEM_ID_MAP из admin-ui/src/features/catalog-editor/CatalogEditor.tsx.
# Применяется при резолве ссылок состава зон; для канонических seed-данных это no-op.
LEGACY_ATOMIC_ITEM_ID_MAP: dict[str, str] = {
    "kitchen-faucet-economy": "kitchen-faucet-c",
    "kitchen-faucet-standard": "kitchen-faucet-b",
    "kitchen-faucet-comfort": "kitchen-faucet-a",
    "kitchen-sink-bowl-economy": "kitchen-sink-bowl-c",
    "kitchen-sink-bowl-standard": "kitchen-sink-bowl-b",
    "kitchen-sink-bowl-comfort": "kitchen-sink-bowl-a",
    "new-item-89": "kitchen-faucet-c",
    "moyka": "kitchen-sink-bowl-c",
}


def migrate_atomic_code(code: str) -> str:
    return LEGACY_ATOMIC_ITEM_ID_MAP.get(code, code)


_CATEGORY_ORDER = ("works", "materials", "equipment", "consumables")


def _dominant(works: float, materials: float, equipment: float, consumables: float) -> str:
    # Доминирующая категория по максимальному из 4 значений (как dominant() в plumbing-seed.ts).
    pairs = [
        ("works", works),
        ("materials", materials),
        ("equipment", equipment),
        ("consumables", consumables),
    ]
    pairs.sort(key=lambda pair: pair[1], reverse=True)
    return pairs[0][0]


@dataclass(frozen=True)
class SeedAtom:
    source_code: str
    public_title: str
    technical_title: str
    unit: str
    work_price: float
    material_price: float
    equipment_price: float
    consumables_price: float
    category: str
    catalog_group: str
    source: str
    coefficient: float = 1.0


def _atom(
    source_code: str,
    public_title: str,
    technical_title: str,
    unit: str,
    works: float,
    materials: float,
    consumables: float,
    equipment: float,
    group: str,
    source: str,
) -> SeedAtom:
    # Порядок works | materials | consumables | equipment — как в TS-хелпере row().
    return SeedAtom(
        source_code=source_code,
        public_title=public_title,
        technical_title=technical_title,
        unit=unit,
        work_price=float(works),
        material_price=float(materials),
        equipment_price=float(equipment),
        consumables_price=float(consumables),
        category=_dominant(works, materials, equipment, consumables),
        catalog_group=group,
        source=source,
    )


PLUMBING_SEED_ATOMS: tuple[SeedAtom, ...] = (
    # C.1. Санузел
    _atom("sink", "Раковина", "sink; выводы ХВС/ГВС/канализация", "шт", 6500, 3500, 1500, 0, "Санузел", "Сан v1"),
    _atom("vanity-sink-set", "Тумба / раковина / комплект", "vanitySinkSet", "комплект", 6500, 1000, 1500, 25000, "Санузел", "код"),
    _atom("sink-faucet", "Смеситель для раковины", "sinkFaucet", "шт", 2500, 1300, 500, 12000, "Санузел", "код"),
    _atom("sink-faucet-designer", "Смеситель для раковины дизайнерский", "sinkFaucetDesigner", "шт", 3000, 1300, 500, 25000, "Санузел", "Сан v1"),
    _atom("wall-hung-toilet", "Инсталляция / унитаз", "wallHungToilet", "шт", 18000, 9000, 2500, 32000, "Санузел", "код"),
    _atom("floor-toilet", "Унитаз напольный", "floorToilet; альтернатива инсталляции", "шт", 7500, 3500, 1000, 18000, "Санузел", "Сан v1"),
    _atom("bidet", "Биде", "bidet", "шт", 8500, 4000, 1000, 25000, "Санузел", "Сан v1"),
    _atom("acrylic-bath", "Акриловая ванна", "acrylicBath", "шт", 9000, 2500, 1500, 25000, "Санузел", "код"),
    _atom("bath-siphon", "Сифон для ванны", "bathSiphon; слив-перелив", "шт", 1500, 2500, 500, 0, "Санузел", "код"),
    _atom("bath-mixer", "Смеситель для ванны с лейкой", "bathMixer", "шт", 2500, 1500, 500, 12000, "Санузел", "код"),
    _atom("bath-screen-porcelain", "Экран для ванны из керамогранита", "bathScreenPorcelain", "шт", 10000, 15000, 2500, 7000, "Санузел", "Сан v1"),
    _atom("shower-outputs", "Душ (выводы)", "showerOutputs; выводы под душевой комплект", "шт", 8500, 4500, 1500, 0, "Санузел", "Сан v1"),
    _atom("shower-enclosure-glass", "Душевой уголок / стеклянное ограждение", "showerEnclosureGlass", "шт", 6500, 2500, 1000, 30000, "Санузел", "Сан v1"),
    _atom("shower-partition-fixed", "Душевая перегородка стационарная", "showerPartitionFixed", "шт", 5000, 1500, 500, 17000, "Санузел", "Сан v1"),
    _atom("shower-tray-tiled", "Душевой поддон из плитки с трапом", "showerTrayTiled", "шт", 20000, 12000, 2500, 0, "Санузел", "Сан v1"),
    _atom("shower-cabin", "Душевая кабина", "showerCabin", "шт", 10000, 5000, 1000, 37000, "Санузел", "Сан v1"),
    _atom("shower-drain", "Душевой трап", "showerDrain (с оборудованием)", "шт", 12000, 7000, 2000, 15000, "Санузел", "Сан v1"),
    _atom("shower-mixer-rail", "Душевой смеситель / душевая стойка", "showerMixerRail", "шт", 2500, 1500, 500, 12000, "Санузел", "Сан v1"),
    _atom("shower-mixer-concealed", "Душевой смеситель / скрытый монтаж", "showerMixerConcealed; встроенный с тропическим душем", "шт", 12000, 3000, 500, 37000, "Санузел", "Сан v1"),
    _atom("shower-mixer-thermostatic", "Термостатический смеситель для душа", "showerMixerThermostatic", "шт", 4500, 2000, 500, 22000, "Санузел", "Сан v1"),
    _atom("concealed-mixer", "Скрытый смеситель / встроенный монтаж", "concealedMixer", "шт", 9000, 4500, 1000, 25000, "Санузел", "Сан v1"),
    _atom("hygienic-shower", "Гигиенический душ", "hygienicShower", "шт", 3500, 1500, 500, 9000, "Санузел", "код"),
    _atom("electric-towel-rail", "Электрический полотенцесушитель", "electricTowelRail", "шт", 4000, 1500, 500, 15000, "Санузел", "код"),
    _atom("bathroom-mirror", "Зеркало в санузле", "bathroomMirror", "шт", 1500, 500, 300, 15000, "Санузел", "Сан v1"),
    # C.2. Кухня
    _atom("kitchen-sink", "Кухонная мойка", "kitchenSink; legacy / не использовать в зонах — разбит на атомы (точки + трубы + работы)", "шт", 6500, 3500, 1500, 0, "Кухня", "код"),
    _atom("kitchen-sink-siphon", "Сифон для кухонной мойки", "kitchenSinkSiphon", "шт", 1500, 2500, 500, 0, "Кухня", "код"),
    _atom("kitchen-siphon-dishwasher", "Сифон кухонный с отводом под ПММ", "kitchenSiphonDishwasher", "шт", 1800, 3000, 500, 0, "Кухня", "Сан v1"),
    _atom("disposer-output", "Вывод под измельчитель", "disposerOutput", "шт", 2500, 2000, 500, 0, "Кухня", "Сан v1"),
    _atom("food-disposer", "Измельчитель пищевых отходов", "foodDisposer", "шт", 3500, 1500, 500, 18000, "Кухня", "Сан v1"),
    _atom("drinking-water-filter", "Фильтр питьевой воды / вывод", "drinkingWaterFilter; очистка воды", "шт", 3500, 2500, 800, 13000, "Кухня", "Сан v1"),
    _atom("dishwasher-outputs-alt", "Выводы под посудомоечную машину", "dishwasherOutputsAlt", "шт", 6500, 3500, 1500, 0, "Кухня", "Сан v1"),
    _atom("drain-clamp-filter", "Дренажный хомут / подключение фильтра к канализации", "drainClampFilter", "шт", 1200, 1200, 300, 0, "Кухня", "Сан v1"),
    _atom("kitchen-faucet-c", "Смеситель для мойки — C", "kitchenFaucetC", "шт", 0, 0, 0, 6000, "Кухня", "вручную"),
    _atom("kitchen-faucet-b", "Смеситель кухонный — пакет B", "kitchenFaucetB", "шт", 2500, 1300, 500, 12000, "Кухня", "код"),
    _atom("kitchen-faucet-a", "Смеситель кухонный — пакет A", "kitchenFaucetA; требует уточнения", "шт", 3000, 1500, 500, 22000, "Кухня", "вручную"),
    _atom("kitchen-sink-bowl-c", "Кухонная мойка — C", "kitchenSinkBowlC", "шт", 0, 0, 0, 6500, "Кухня", "вручную"),
    _atom("kitchen-sink-bowl-b", "Мойка кухонная — пакет B", "kitchenSinkBowlB; требует уточнения", "шт", 0, 0, 0, 0, "Кухня", "вручную"),
    _atom("kitchen-sink-bowl-a", "Мойка кухонная — пакет A", "kitchenSinkBowlA; требует уточнения", "шт", 0, 0, 0, 0, "Кухня", "вручную"),
    _atom("dishwasher-45-package-c", "ПММ 45 см — пакет C", "dishwasher45PackageC; требует уточнения — цена оборудования", "шт", 0, 0, 0, 0, "Кухня", "вручную"),
    _atom("dishwasher-45-package-b", "ПММ 45 см — пакет B", "dishwasher45PackageB; требует уточнения — цена оборудования", "шт", 0, 0, 0, 0, "Кухня", "вручную"),
    _atom("dishwasher-60-package-a", "ПММ 60 см — пакет A", "dishwasher60PackageA; требует уточнения — цена оборудования", "шт", 0, 0, 0, 0, "Кухня", "вручную"),
    # C.3. Тех. зона
    _atom("dishwasher-output", "Выводы для ПМ машины", "dishwasherOutput", "шт", 5500, 3000, 1000, 0, "Тех. зона", "код"),
    _atom("washer-dryer-output", "Выводы стиральная / сушильная машина", "washerDryerOutput", "шт", 6500, 3500, 1500, 0, "Тех. зона", "код"),
    _atom("washer-siphon-output", "Сифон / вывод для стиральной машины", "washerSiphonOutput", "шт", 1500, 1800, 500, 0, "Тех. зона", "Сан v1"),
    # C.4. Узел
    _atom("water-collector", "Коллектор ХВС / ГВС", "waterCollector", "шт", 10000, 28000, 3000, 0, "Узел", "код"),
    _atom("water-filters", "Фильтры водоснабжения", "waterFilters", "шт", 5000, 18000, 1500, 0, "Узел", "код"),
    _atom("pressure-reducer", "Редуктор давления ХВС / ГВС", "pressureReducer", "шт", 3500, 8000, 1000, 0, "Узел", "Сан v1"),
    _atom("pressure-gauges", "Манометры", "pressureGauges", "шт", 1000, 2500, 300, 0, "Узел", "Сан v1"),
    _atom("check-valves", "Обратные клапаны", "checkValves", "шт", 1500, 2500, 500, 0, "Узел", "Сан v1"),
    _atom("collector-cabinet", "Шкаф коллекторный / сантехнический короб", "collectorCabinet", "шт", 4500, 8000, 1000, 0, "Узел", "Сан v1"),
    _atom("leak-protection", "Система защиты от протечек", "leakProtection; датчики и перекрытие воды", "шт", 9000, 8000, 1500, 45000, "Узел", "код"),
    _atom("revision-hatch", "Скрытый ревизионный люк", "revisionHatch", "шт", 3500, 7000, 500, 0, "Узел", "Сан v1"),
    _atom("water-heater-storage", "Водонагреватель накопительный", "waterHeaterStorage", "шт", 7000, 3500, 1000, 25000, "Узел", "Сан v1"),
    _atom("water-heater-flow", "Водонагреватель проточный", "waterHeaterFlow", "шт", 6000, 3000, 1000, 15000, "Узел", "Сан v1"),
    # C.5. Доп.
    _atom("shutoff-valves", "Отсечные краны", "shutoffValves; кол-во = max(4, ХВС+ГВС точек)", "шт", 500, 850, 100, 0, "Доп.", "код"),
    _atom("cold-hot-water-point", "Дополнительная точка ХВС / ГВС", "coldHotWaterPoint", "шт", 4500, 3000, 1000, 0, "Доп.", "Сан v1"),
    _atom("extra-sewer-point", "Дополнительная точка канализации", "extraSewerPoint", "шт", 4500, 2500, 1000, 0, "Доп.", "Сан v1"),
    # C.6. Расходники
    _atom("siphon-connection-reserve", "Сифон / комплект подключения (резерв)", "siphonConnectionReserve", "комплект", 1500, 2500, 500, 0, "Расходники", "Сан v1"),
    _atom("sink-pop-up-waste", "Донный клапан / выпуск для раковины", "sinkPopUpWaste", "шт", 800, 1200, 300, 0, "Расходники", "Сан v1"),
    _atom("sink-siphon", "Сифон для раковины", "sinkSiphon", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),
    _atom("vanity-sink-siphon", "Сифон для тумбы с раковиной", "vanitySinkSiphon", "шт", 1500, 2000, 500, 0, "Расходники", "Сан v1"),
    _atom("bath-siphon-overflow", "Сифон для ванны / слив-перелив", "bathSiphonOverflow", "шт", 1500, 2500, 500, 0, "Расходники", "Сан v1"),
    _atom("shower-tray-siphon", "Сифон для душевого поддона", "showerTraySiphon", "шт", 2000, 2500, 500, 0, "Расходники", "Сан v1"),
    _atom("shower-drain-trap", "Трап душевой с гидрозатвором", "showerDrainTrap", "шт", 3500, 8000, 1000, 0, "Расходники", "Сан v1"),
    _atom("fan-outlet-cuff-toilet", "Фановый отвод / манжета для унитаза", "fanOutletCuffToilet", "шт", 1500, 1500, 500, 0, "Расходники", "Сан v1"),
    _atom("fan-outlet-cuff-install", "Фановый отвод / манжета для инсталляции", "fanOutletCuffInstall", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),
    _atom("bidet-siphon", "Сифон / выпуск для биде", "bidetSiphon", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),
    # C.7. Отопление
    _atom("radiator-replacement", "Замена радиатора отопительного (диз.)", "radiatorReplacement", "шт", 6000, 20000, 1200, 5000, "Отопление", "Сан v1"),
    # Работы · ХВС/ГВС
    _atom("work-water-point", "Монтаж точки ХВС/ГВС", "работа; точка водоснабжения", "шт", 3500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-water-rosette-valves", "Монтаж кранов водорозеток", "работа", "шт", 400, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-hygienic-shower-rough", "Монтаж встроенного гигиенического душа (черновой)", "работа; черновой этап", "шт", 4500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-meter-relocation-130", "Перенос счётчика на высоту 130 см", "работа", "усл.", 1800, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-hygienic-shower-finish", "Монтаж гигиенического душа (чистовой)", "работа; чистовой этап", "шт", 1000, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-shower-mixer-install", "Монтаж душевого смесителя", "работа", "шт", 1500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-vanity-sink-faucet-install", "Монтаж раковины на тумбе со смесителем", "работа", "шт", 4000, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    _atom("work-sink-mixer-siphon-connect", "Подключение смесителя и сифона мойки", "работа", "шт", 1500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
    # Работы · Канализация
    _atom("work-sewer-point", "Монтаж точки канализации", "работа; точка канализации", "шт", 2500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
    _atom("work-install-frame-rough", "Монтаж инсталляции с подключением к сетям (черновой)", "работа; черновой этап", "шт", 6500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
    _atom("work-wall-toilet-finish", "Монтаж подвесного унитаза (чистовой)", "работа; чистовой этап", "шт", 3000, 0, 0, 0, "Работы · Канализация", "Смета работ"),
    _atom("work-dishwasher-connect", "Подключение посудомойки", "работа", "шт", 500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
    _atom("work-washer-install-connect", "Установка и подключение стиральной машины", "работа", "шт", 1500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
    # Трассы / подготовка (работы)
    _atom("work-groove-pipe", "Штробление под трубу", "работа; штробление под прокладку труб", "м.п.", 900, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
    _atom("work-wall-chase", "Штробление стены", "работа", "м.п.", 900, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
    _atom("work-floor-opening", "Вскрытие пола", "работа", "м.п.", 600, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
    _atom("work-slab-glue-mount", "Монтаж плиты на клей", "работа", "шт", 900, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
    _atom("work-risers-restore", "Восстановление стояков", "работа", "усл.", 1500, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
    # Тёплый пол / отопление
    _atom("work-warm-floor-chase", "Монтаж тёплого пола в штробу с заделкой", "работа; отдельный модуль, не смешивать с сантехникой", "м²", 1600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),
    _atom("work-radiator-demolition", "Демонтаж радиатора с заглушиванием выводов", "работа; отдельный модуль, не смешивать с сантехникой", "шт", 1600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),
    _atom("work-radiator-thermo-reconnect", "Демонтаж труб радиатора, установка терморегулятора, подключение", "работа; отдельный модуль, не смешивать с сантехникой", "усл.", 4600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),
    # Материалы (трубы)
    _atom("pipe-sewer-110", "Труба канализационная 110 мм", "материал; Бауцентр/Cosmoplast", "м.п.", 0, 240, 0, 0, "Трассы / подготовка", "Бауцентр/Cosmoplast"),
    _atom("pipe-sewer-50", "Труба канализационная 50 мм", "материал; Бауцентр/Cosmoplast", "м.п.", 0, 155, 0, 0, "Трассы / подготовка", "Бауцентр/Cosmoplast"),
    _atom("pipe-ppr-d20", "Труба PPR d20", "материал; VALFEX; 10 м.п. на водяную точку (ХВС+ГВС = ×2); Санта-Сервис", "м.п.", 0, 115, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
    _atom("ppr-d20-outlet", "Выход / подключение PPR d20", "материал; ППР колено настенное РВ d20×1/2; 6 шт. на водяную точку; УТ-1107/1108/1109", "шт", 0, 121.28, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
    _atom("ppr-d20-fitting", "Фитинг / поворот PPR d20", "материал; ППР колено 90° d20; 6 шт. на водяную точку; УТ-1107/1108/1109", "шт", 0, 10.05, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
    _atom("kit-ppr-d20-40m", "Комплект PPR d20 (~40 м + фитинги)", "типовой комплект на квартиру, остаётся 2–3 трубы; Санта-Сервис", "комплект", 0, 4836.87, 0, 0, "Узел", "Санта-Сервис"),
    _atom("pipe-clamp-ppr-d20", "Крепёж трубы (хомут) PPR d20", "материал; Хомут металл 20-24; 1,5 шт. на м.п. трубы; УТ-1107/1108/1109", "шт", 0, 77.52, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
    _atom("pipe-clamp-sewer", "Крепёж трубы (хомут) канализация", "материал; Хомут металл 32-37 (50/110 мм); 1,5 шт. на м.п. трубы; УТ-1107/1108/1109", "шт", 0, 86.64, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
)


@dataclass(frozen=True)
class SeedComposition:
    atomic_source_code: str
    quantity: float
    coefficient: float = 1.0


@dataclass(frozen=True)
class SeedPackage:
    package_code: str
    label: str
    items: tuple[SeedComposition, ...]


@dataclass(frozen=True)
class SeedZone:
    zone_code: str
    subgroup: str
    title: str
    description: str
    active_package_code: str | None
    base: tuple[SeedComposition, ...]
    packages: tuple[SeedPackage, ...] = ()
    risk_percent: float = DEFAULT_ZONE_RISK_PERCENT


PLUMBING_SEED_ZONES: tuple[SeedZone, ...] = (
    SeedZone(
        zone_code="zone-kitchen-sink",
        subgroup="Кухня",
        title="Зона мойки",
        description=(
            "База: точки ХВС/ГВС и канализации, подключение, сифон, штробление 6 м.п. (ориентир без проекта), "
            "трубы (PPR 20 м = 10 м × 2 точки; выходы и фитинги по 12 шт = 6×2; канализация 50 мм 3,5 м.п.; "
            "крепёж 1,5 шт/м.п.). Пакет комплектации — смеситель + мойка (переключатель ниже)."
        ),
        active_package_code="b",
        base=(
            SeedComposition("work-water-point", 1),
            SeedComposition("work-sewer-point", 1),
            SeedComposition("work-sink-mixer-siphon-connect", 1),
            SeedComposition("kitchen-sink-siphon", 1),
            SeedComposition("pipe-sewer-50", 3.5),
            SeedComposition("pipe-ppr-d20", 20),
            SeedComposition("ppr-d20-outlet", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("ppr-d20-fitting", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("pipe-clamp-ppr-d20", _pipe_clamp_qty(20)),
            SeedComposition("pipe-clamp-sewer", _pipe_clamp_qty(3.5)),
            SeedComposition("work-groove-pipe", SINK_ZONE_GROOVE_METERS),
        ),
        packages=(
            SeedPackage("c", "Пакет C", (SeedComposition("kitchen-faucet-c", 1), SeedComposition("kitchen-sink-bowl-c", 1))),
            SeedPackage("b", "Пакет B", (SeedComposition("kitchen-faucet-b", 1), SeedComposition("kitchen-sink-bowl-b", 1))),
            SeedPackage("a", "Пакет A", (SeedComposition("kitchen-faucet-a", 1), SeedComposition("kitchen-sink-bowl-a", 1))),
        ),
    ),
    SeedZone(
        zone_code="zone-kitchen-dishwasher",
        subgroup="Кухня",
        title="Зона ПММ",
        description=(
            "База: точка ХВС и канализации, подключение ПММ, штробление 4 м.п. (ориентир без проекта), "
            "трубы (PPR 10 м = 10 м × 1 точка ХВС; выходы и фитинги по 6 шт; канализация 50 мм 2 м.п.; "
            "крепёж 1,5 шт/м.п.). Пакет — встраиваемая ПММ 45/60 см (переключатель ниже). "
            "Оборудование — placeholder, требует уточнения."
        ),
        active_package_code="b",
        base=(
            SeedComposition("work-water-point", 1),
            SeedComposition("work-sewer-point", 1),
            SeedComposition("work-dishwasher-connect", 1),
            SeedComposition("pipe-sewer-50", DISHWASHER_ZONE_SEWER_METERS),
            SeedComposition("pipe-ppr-d20", DISHWASHER_ZONE_PPR_METERS),
            SeedComposition("ppr-d20-outlet", WATER_POINT_FITTINGS_QTY),
            SeedComposition("ppr-d20-fitting", WATER_POINT_FITTINGS_QTY),
            SeedComposition("pipe-clamp-ppr-d20", _pipe_clamp_qty(DISHWASHER_ZONE_PPR_METERS)),
            SeedComposition("pipe-clamp-sewer", _pipe_clamp_qty(DISHWASHER_ZONE_SEWER_METERS)),
            SeedComposition("work-groove-pipe", DISHWASHER_ZONE_GROOVE_METERS),
        ),
        packages=(
            SeedPackage("c", "Пакет C", (SeedComposition("dishwasher-45-package-c", 1),)),
            SeedPackage("b", "Пакет B", (SeedComposition("dishwasher-45-package-b", 1),)),
            SeedPackage("a", "Пакет A", (SeedComposition("dishwasher-60-package-a", 1),)),
        ),
    ),
    SeedZone(
        zone_code="zone-bathroom-vanity",
        subgroup="Санузел",
        title="Зона умывальника",
        description=(
            "База: точки ХВС/ГВС и канализации, монтаж тумбы, штробление 6 м.п. (ориентир без проекта), "
            "трубы. Комплектация — тумба, смеситель, сифон (фаза 2: пакеты C/B/A)."
        ),
        active_package_code=None,
        base=(
            SeedComposition("work-water-point", 1),
            SeedComposition("work-sewer-point", 1),
            SeedComposition("work-vanity-sink-faucet-install", 1),
            SeedComposition("vanity-sink-siphon", 1),
            SeedComposition("pipe-sewer-50", 3.5),
            SeedComposition("pipe-ppr-d20", 20),
            SeedComposition("ppr-d20-outlet", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("ppr-d20-fitting", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("pipe-clamp-ppr-d20", _pipe_clamp_qty(20)),
            SeedComposition("pipe-clamp-sewer", _pipe_clamp_qty(3.5)),
            SeedComposition("work-groove-pipe", ZONE_GROOVE_METERS_DEFAULT),
            SeedComposition("vanity-sink-set", 1),
            SeedComposition("sink-faucet", 1),
        ),
    ),
    SeedZone(
        zone_code="zone-bathroom-shower",
        subgroup="Санузел",
        title="Душевая зона",
        description=(
            "База: выводы под душ, точки ХВС/ГВС и канализации, трап, монтаж смесителя, штробление 6 м.п., "
            "трубы (PPR 20 м; канализация 50 мм 3 м.п.). Пакет — тип душевого комплекта (переключатель ниже)."
        ),
        active_package_code="b",
        base=(
            SeedComposition("shower-outputs", 1),
            SeedComposition("work-water-point", 2),
            SeedComposition("work-sewer-point", 1),
            SeedComposition("work-shower-mixer-install", 1),
            SeedComposition("shower-drain-trap", 1),
            SeedComposition("pipe-sewer-50", SHOWER_ZONE_SEWER_METERS),
            SeedComposition("pipe-ppr-d20", SHOWER_ZONE_PPR_METERS),
            SeedComposition("ppr-d20-outlet", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("ppr-d20-fitting", WATER_POINT_FITTINGS_QTY * 2),
            SeedComposition("pipe-clamp-ppr-d20", _pipe_clamp_qty(SHOWER_ZONE_PPR_METERS)),
            SeedComposition("pipe-clamp-sewer", _pipe_clamp_qty(SHOWER_ZONE_SEWER_METERS)),
            SeedComposition("work-groove-pipe", SHOWER_ZONE_GROOVE_METERS),
        ),
        packages=(
            SeedPackage("c", "Пакет C", (SeedComposition("shower-cabin", 1),)),
            SeedPackage("b", "Пакет B", (SeedComposition("shower-enclosure-glass", 1), SeedComposition("shower-mixer-rail", 1))),
            SeedPackage("a", "Пакет A", (SeedComposition("shower-mixer-concealed", 1), SeedComposition("shower-partition-fixed", 1))),
        ),
    ),
    SeedZone(
        zone_code="zone-bathroom-install-relocation",
        subgroup="Санузел",
        title="Перенос инсталляции",
        description=(
            "Работы и трассы переноса подвесного унитаза: черновой и чистовой монтаж инсталляции, "
            "точки ХВС/канализации, фановый отвод, штробление 8 м.п., трубы (PPR 15 м; канализация 110 мм 2 м.п.). "
            "Оборудование унитаза/инсталляции — отдельно или в комплекте санузла."
        ),
        active_package_code=None,
        base=(
            SeedComposition("work-install-frame-rough", 1),
            SeedComposition("work-wall-toilet-finish", 1),
            SeedComposition("work-water-point", 1),
            SeedComposition("work-sewer-point", 1),
            SeedComposition("fan-outlet-cuff-install", 1),
            SeedComposition("pipe-sewer-110", INSTALL_RELOCATION_SEWER_METERS),
            SeedComposition("pipe-ppr-d20", INSTALL_RELOCATION_PPR_METERS),
            SeedComposition("ppr-d20-outlet", WATER_POINT_FITTINGS_QTY),
            SeedComposition("ppr-d20-fitting", WATER_POINT_FITTINGS_QTY),
            SeedComposition("pipe-clamp-ppr-d20", _pipe_clamp_qty(INSTALL_RELOCATION_PPR_METERS)),
            SeedComposition("pipe-clamp-sewer", _pipe_clamp_qty(INSTALL_RELOCATION_SEWER_METERS)),
            SeedComposition("work-groove-pipe", INSTALL_RELOCATION_GROOVE_METERS),
        ),
    ),
    # --- A8.2: миграция legacy-опций сантехники (плоские include*-опции) в зоны ---
    # Каждая зона ниже перенесена 1:1 из плоской ветки calculatePlumbing/plumbingRates.
    # Состав — те же атомы и цены, что были в plumbingRates; итог = Σ атомов × (1 + 6.4 %),
    # запекается общим механизмом снапшота (без пакетов C/B/A — выбора класса оборудования нет).
    # Конвенция: единица зоны = один экземпляр (как у zone-kitchen-sink / zone-bathroom-shower);
    # прежний множитель × bathroomCount у legacy-опций не переносится (зона добавляется один раз).
    SeedZone(
        zone_code="zone-bathroom-set",
        subgroup="Санузел",
        title="Комплект санузла",
        description=(
            "Базовый комплект приборов санузла: тумба с раковиной (vanity-sink-set), смеситель раковины "
            "и инсталляция с подвесным унитазом. Перенос плоской опции includeBathroomSet (A8.2)."
        ),
        active_package_code=None,
        base=(
            SeedComposition("vanity-sink-set", 1),
            SeedComposition("sink-faucet", 1),
            SeedComposition("wall-hung-toilet", 1),
        ),
    ),
    SeedZone(
        zone_code="zone-bathroom-bath",
        subgroup="Санузел",
        title="Ванна со смесителем",
        description=(
            "Акриловая ванна, сифон (слив-перелив) и смеситель с лейкой. "
            "Перенос плоской опции includeBath (A8.2). Взаимоисключение с душевой зоной — в UI."
        ),
        active_package_code=None,
        base=(
            SeedComposition("acrylic-bath", 1),
            SeedComposition("bath-siphon", 1),
            SeedComposition("bath-mixer", 1),
        ),
    ),
    SeedZone(
        zone_code="zone-bathroom-hygienic-shower",
        subgroup="Санузел",
        title="Гигиенический душ",
        description="Выводы и подключение гигиенического душа в санузле. Перенос плоской опции includeHygienicShower (A8.2).",
        active_package_code=None,
        base=(SeedComposition("hygienic-shower", 1),),
    ),
    SeedZone(
        zone_code="zone-bathroom-towel-rail",
        subgroup="Санузел",
        title="Электрический полотенцесушитель",
        description="Монтаж и подключение электрического полотенцесушителя. Перенос плоской опции includeElectricTowelRail (A8.2).",
        active_package_code=None,
        base=(SeedComposition("electric-towel-rail", 1),),
    ),
    SeedZone(
        zone_code="zone-tech-washer-output",
        subgroup="Тех. зона",
        title="Вывод под стиральную / сушильную машину",
        description="Выводы под стиральную и сушильную машину. Перенос плоской опции includeWasherOutput (A8.2).",
        active_package_code=None,
        base=(SeedComposition("washer-dryer-output", 1),),
    ),
    SeedZone(
        zone_code="zone-water-node",
        subgroup="Узел",
        title="Сантехнический узел",
        description=(
            "Базовый сантехнический узел объекта: коллектор ХВС/ГВС, фильтры водоснабжения и отсечные краны. "
            "Перенос плоской опции includeWaterNode (A8.2). FLAG: количество отсечных кранов зафиксировано на "
            "минимуме 4 шт. — ранее зависело от числа водяных точек (max(4, ХВС+ГВС))."
        ),
        active_package_code=None,
        base=(
            SeedComposition("water-collector", 1),
            SeedComposition("water-filters", 1),
            SeedComposition("shutoff-valves", WATER_NODE_SHUTOFF_VALVES_QTY),
        ),
    ),
    SeedZone(
        zone_code="zone-water-leak-protection",
        subgroup="Узел",
        title="Система защиты от протечек",
        description="Датчики протечки и перекрытие воды. Перенос плоской опции includeLeakProtection (A8.2; в UI — поверх сантехнического узла).",
        active_package_code=None,
        base=(SeedComposition("leak-protection", 1),),
    ),
)


@dataclass
class PlumbingSeedReport:
    atoms_total: int = 0
    atoms_inserted: int = 0
    atoms_updated: int = 0
    zones_total: int = 0
    zones_inserted: int = 0
    zones_updated: int = 0
    zone_items_total: int = 0
    zone_items_replaced: int = 0
    packages_total: int = 0
    package_items_total: int = 0
    packages_replaced: int = 0
    notes: list[str] = field(default_factory=list)

    @property
    def changed(self) -> bool:
        return bool(
            self.atoms_inserted
            or self.atoms_updated
            or self.zones_inserted
            or self.zones_updated
            or self.zone_items_replaced
            or self.packages_replaced
        )


def _atom_desired_values(atom: SeedAtom) -> dict[str, Any]:
    return {
        "public_title": atom.public_title,
        "technical_title": atom.technical_title,
        "category": atom.category,
        "unit": atom.unit,
        "work_price": atom.work_price,
        "material_price": atom.material_price,
        "equipment_price": atom.equipment_price,
        "consumables_price": atom.consumables_price,
        "coefficient": atom.coefficient,
        "catalog_group": atom.catalog_group,
        "source": atom.source,
        "is_active": 1,
        "sort_order": 100,
    }


def _zone_desired_values(zone: SeedZone, sort_order: int) -> dict[str, Any]:
    return {
        "subgroup": zone.subgroup,
        "title": zone.title,
        "description": zone.description,
        "disclaimer": None,
        "risk_percent": zone.risk_percent,
        "active_package_code": zone.active_package_code,
        "is_active": 1,
        "sort_order": sort_order,
    }


def _values_differ(existing: Any, desired: Any) -> bool:
    if isinstance(existing, (int, float)) and isinstance(desired, (int, float)):
        return abs(float(existing) - float(desired)) > 1e-9
    return existing != desired


async def _upsert_atoms(session: AsyncSession, report: PlumbingSeedReport) -> dict[str, int]:
    atom_id_by_code: dict[str, int] = {}
    table = estimate_plumbing_catalog_items
    for atom in PLUMBING_SEED_ATOMS:
        report.atoms_total += 1
        desired = _atom_desired_values(atom)
        existing = (
            await session.execute(
                select(table).where(
                    table.c.owner_user_id.is_(None),
                    table.c.source_code == atom.source_code,
                )
            )
        ).mappings().first()
        if existing is None:
            result = await session.execute(
                insert(table).values(owner_user_id=None, source_code=atom.source_code, **desired)
            )
            atom_id_by_code[atom.source_code] = int(result.inserted_primary_key[0])
            report.atoms_inserted += 1
            continue
        atom_id_by_code[atom.source_code] = int(existing["id"])
        diff = {key: value for key, value in desired.items() if _values_differ(existing[key], value)}
        if diff:
            await session.execute(
                update(table)
                .where(table.c.owner_user_id.is_(None), table.c.source_code == atom.source_code)
                .values(**diff)
            )
            report.atoms_updated += 1
    return atom_id_by_code


async def _composition_signature(rows: list[dict[str, Any]]) -> list[tuple[Any, ...]]:
    return [
        (
            str(row["atomic_source_code"]),
            int(row["atomic_item_id"]) if row["atomic_item_id"] is not None else None,
            round(float(row["quantity"]), 6),
            round(float(row["coefficient"]), 6),
            int(row["sort_order"]),
        )
        for row in rows
    ]


def _desired_composition_rows(
    items: tuple[SeedComposition, ...],
    atom_id_by_code: dict[str, int],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, item in enumerate(items, start=1):
        code = migrate_atomic_code(item.atomic_source_code)
        rows.append(
            {
                "atomic_source_code": code,
                "atomic_item_id": atom_id_by_code.get(code),
                "quantity": float(item.quantity),
                "coefficient": float(item.coefficient),
                "sort_order": index * 10,
            }
        )
    return rows


async def _sync_zone_items(
    session: AsyncSession,
    zone_id: int,
    desired_rows: list[dict[str, Any]],
    report: PlumbingSeedReport,
) -> None:
    table = estimate_plumbing_zone_items
    report.zone_items_total += len(desired_rows)
    existing_rows = (
        (
            await session.execute(
                select(table)
                .where(table.c.owner_user_id.is_(None), table.c.zone_id == zone_id)
                .order_by(table.c.sort_order, table.c.id)
            )
        )
        .mappings()
        .all()
    )
    existing_sig = await _composition_signature([dict(row) for row in existing_rows])
    desired_sig = await _composition_signature(desired_rows)
    if existing_sig == desired_sig:
        return
    await session.execute(delete(table).where(table.c.owner_user_id.is_(None), table.c.zone_id == zone_id))
    for row in desired_rows:
        await session.execute(insert(table).values(owner_user_id=None, zone_id=zone_id, **row))
    report.zone_items_replaced += 1


async def _sync_zone_packages(
    session: AsyncSession,
    zone_id: int,
    zone: SeedZone,
    atom_id_by_code: dict[str, int],
    report: PlumbingSeedReport,
) -> None:
    packages_table = estimate_plumbing_zone_packages
    items_table = estimate_plumbing_zone_package_items

    desired = []
    for package_index, package in enumerate(zone.packages, start=1):
        rows = _desired_composition_rows(package.items, atom_id_by_code)
        report.packages_total += 1
        report.package_items_total += len(rows)
        desired.append(
            {
                "package_code": package.package_code,
                "label": package.label,
                "sort_order": package_index * 10,
                "items": rows,
            }
        )

    existing_packages = (
        (
            await session.execute(
                select(packages_table)
                .where(packages_table.c.owner_user_id.is_(None), packages_table.c.zone_id == zone_id)
                .order_by(packages_table.c.sort_order, packages_table.c.id)
            )
        )
        .mappings()
        .all()
    )
    existing_signature = []
    for package in existing_packages:
        package_items = (
            (
                await session.execute(
                    select(items_table)
                    .where(items_table.c.owner_user_id.is_(None), items_table.c.package_id == package["id"])
                    .order_by(items_table.c.sort_order, items_table.c.id)
                )
            )
            .mappings()
            .all()
        )
        existing_signature.append(
            (
                str(package["package_code"]),
                package["label"],
                int(package["sort_order"]),
                await _composition_signature([dict(row) for row in package_items]),
            )
        )
    desired_signature = [
        (
            package["package_code"],
            package["label"],
            int(package["sort_order"]),
            await _composition_signature(package["items"]),
        )
        for package in desired
    ]
    if existing_signature == desired_signature:
        return

    await session.execute(
        delete(items_table).where(items_table.c.owner_user_id.is_(None), items_table.c.zone_id == zone_id)
    )
    await session.execute(
        delete(packages_table).where(packages_table.c.owner_user_id.is_(None), packages_table.c.zone_id == zone_id)
    )
    for package in desired:
        package_result = await session.execute(
            insert(packages_table).values(
                owner_user_id=None,
                zone_id=zone_id,
                package_code=package["package_code"],
                label=package["label"],
                sort_order=package["sort_order"],
            )
        )
        package_id = int(package_result.inserted_primary_key[0])
        for row in package["items"]:
            await session.execute(
                insert(items_table).values(owner_user_id=None, zone_id=zone_id, package_id=package_id, **row)
            )
    report.packages_replaced += 1


async def _upsert_zones(
    session: AsyncSession,
    atom_id_by_code: dict[str, int],
    report: PlumbingSeedReport,
) -> None:
    table = estimate_plumbing_zones
    for zone_index, zone in enumerate(PLUMBING_SEED_ZONES, start=1):
        report.zones_total += 1
        sort_order = zone_index * 10
        desired = _zone_desired_values(zone, sort_order)
        existing = (
            await session.execute(
                select(table).where(table.c.owner_user_id.is_(None), table.c.zone_code == zone.zone_code)
            )
        ).mappings().first()
        if existing is None:
            result = await session.execute(
                insert(table).values(owner_user_id=None, zone_code=zone.zone_code, **desired)
            )
            zone_id = int(result.inserted_primary_key[0])
            report.zones_inserted += 1
        else:
            zone_id = int(existing["id"])
            diff = {key: value for key, value in desired.items() if _values_differ(existing[key], value)}
            if diff:
                await session.execute(
                    update(table)
                    .where(table.c.owner_user_id.is_(None), table.c.zone_code == zone.zone_code)
                    .values(**diff)
                )
                report.zones_updated += 1

        await _sync_zone_items(
            session,
            zone_id,
            _desired_composition_rows(zone.base, atom_id_by_code),
            report,
        )
        await _sync_zone_packages(session, zone_id, zone, atom_id_by_code, report)


async def ensure_global_plumbing_defaults(
    session_factory: async_sessionmaker[AsyncSession],
) -> PlumbingSeedReport:
    """Идемпотентно засевает глобальные дефолты сантехники (owner_user_id = NULL).

    Повторный запуск не создаёт дублей и не меняет данные: атомы upsert-ятся по source_code,
    зоны — по zone_code, а состав/пакеты переписываются только при фактическом расхождении.
    Seed — системный bootstrap: аудит (estimate_plumbing_catalog_audit) намеренно не пишется.
    """

    report = PlumbingSeedReport()
    async with session_factory() as session:
        async with session.begin():
            atom_id_by_code = await _upsert_atoms(session, report)
            await _upsert_zones(session, atom_id_by_code, report)
    return report


async def _seed_from_settings() -> PlumbingSeedReport:
    from supply_bot.config import load_settings
    from supply_bot.database.metadata import metadata
    from supply_bot.database.runtime import create_database_runtime

    settings = load_settings()
    database_runtime = create_database_runtime(settings)
    try:
        if database_runtime.backend == "sqlite":
            await database_runtime.create_metadata(metadata)
        return await ensure_global_plumbing_defaults(database_runtime.session_factory)
    finally:
        await database_runtime.dispose()


def main() -> None:
    report = asyncio.run(_seed_from_settings())
    print(
        "Plumbing seed: "
        f"atoms={report.atoms_total} (insert {report.atoms_inserted}, update {report.atoms_updated}), "
        f"zones={report.zones_total} (insert {report.zones_inserted}, update {report.zones_updated}), "
        f"zone_items={report.zone_items_total} (replace {report.zone_items_replaced}), "
        f"packages={report.packages_total} (replace {report.packages_replaced}), "
        f"package_items={report.package_items_total}, changed={report.changed}"
    )


if __name__ == "__main__":
    main()


__all__ = [
    "LEGACY_ATOMIC_ITEM_ID_MAP",
    "PLUMBING_SEED_ATOMS",
    "PLUMBING_SEED_ZONES",
    "PlumbingSeedReport",
    "SeedAtom",
    "SeedComposition",
    "SeedPackage",
    "SeedZone",
    "ensure_global_plumbing_defaults",
    "main",
    "migrate_atomic_code",
]
