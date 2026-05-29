// Локальный редактор каталога расценок (внутренний инструмент).
// НЕ публичная страница, не подключается к продовой навигации.
// Источник предзаполнения — "Сан v1" из docs/calculator-plumbing-scenarios-model.md.
// Числа взяты строго из документа, ничего не выдумано.

export type CatalogCategory = "works" | "materials" | "equipment" | "consumables";

export type CatalogUnit = "шт" | "м.п." | "м²" | "комплект" | "усл.";

export type CatalogSource = "Сан v1" | "код" | "вручную" | "Смета работ" | "Бауцентр/Cosmoplast" | "Санта-Сервис";

export type CatalogGroup =
  | "Санузел"
  | "Кухня"
  | "Тех. зона"
  | "Узел"
  | "Доп."
  | "Расходники"
  | "Отопление"
  | "Работы · ХВС/ГВС"
  | "Работы · Канализация"
  | "Трассы / подготовка"
  | "Тёплый пол / отопление";

export type CatalogItem = {
  id: string;
  publicTitle: string;
  technicalTitle: string;
  category: CatalogCategory;
  unit: CatalogUnit;
  works: number;
  materials: number;
  equipment: number;
  consumables: number;
  coefficient: number;
  group: CatalogGroup;
  source: CatalogSource;
};

// Доминирующая категория по максимальному из 4 значений (для колонки "Категория").
function dominant(works: number, materials: number, equipment: number, consumables: number): CatalogCategory {
  const entries: Array<[CatalogCategory, number]> = [
    ["works", works],
    ["materials", materials],
    ["equipment", equipment],
    ["consumables", consumables],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

// Хелпер: в Сан v1 числа идут в порядке works | materials | consumables | equipment.
function row(
  id: string,
  publicTitle: string,
  technicalTitle: string,
  unit: CatalogUnit,
  works: number,
  materials: number,
  consumables: number,
  equipment: number,
  group: CatalogGroup,
  source: CatalogSource,
): CatalogItem {
  return {
    id,
    publicTitle,
    technicalTitle,
    category: dominant(works, materials, equipment, consumables),
    unit,
    works,
    materials,
    equipment,
    consumables,
    coefficient: 1,
    group,
    source,
  };
}

// 59 атомарных позиций "Сан v1" (разделы C.1–C.7 документа).
export const PLUMBING_SEED: CatalogItem[] = [
  // C.1. Санузел
  row("sink", "Раковина", "sink; выводы ХВС/ГВС/канализация", "шт", 6500, 3500, 1500, 0, "Санузел", "Сан v1"),
  row("vanity-sink-set", "Тумба / раковина / комплект", "vanitySinkSet", "комплект", 6500, 1000, 1500, 25000, "Санузел", "код"),
  row("sink-faucet", "Смеситель для раковины", "sinkFaucet", "шт", 2500, 1300, 500, 12000, "Санузел", "код"),
  row("sink-faucet-designer", "Смеситель для раковины дизайнерский", "sinkFaucetDesigner", "шт", 3000, 1300, 500, 25000, "Санузел", "Сан v1"),
  row("wall-hung-toilet", "Инсталляция / унитаз", "wallHungToilet", "шт", 18000, 9000, 2500, 32000, "Санузел", "код"),
  row("floor-toilet", "Унитаз напольный", "floorToilet; альтернатива инсталляции", "шт", 7500, 3500, 1000, 18000, "Санузел", "Сан v1"),
  row("bidet", "Биде", "bidet", "шт", 8500, 4000, 1000, 25000, "Санузел", "Сан v1"),
  row("acrylic-bath", "Акриловая ванна", "acrylicBath", "шт", 9000, 2500, 1500, 25000, "Санузел", "код"),
  row("bath-siphon", "Сифон для ванны", "bathSiphon; слив-перелив", "шт", 1500, 2500, 500, 0, "Санузел", "код"),
  row("bath-mixer", "Смеситель для ванны с лейкой", "bathMixer", "шт", 2500, 1500, 500, 12000, "Санузел", "код"),
  row("bath-screen-porcelain", "Экран для ванны из керамогранита", "bathScreenPorcelain", "шт", 10000, 15000, 2500, 7000, "Санузел", "Сан v1"),
  row("shower-outputs", "Душ (выводы)", "showerOutputs; выводы под душевой комплект", "шт", 8500, 4500, 1500, 0, "Санузел", "Сан v1"),
  row("shower-enclosure-glass", "Душевой уголок / стеклянное ограждение", "showerEnclosureGlass", "шт", 6500, 2500, 1000, 30000, "Санузел", "Сан v1"),
  row("shower-partition-fixed", "Душевая перегородка стационарная", "showerPartitionFixed", "шт", 5000, 1500, 500, 17000, "Санузел", "Сан v1"),
  row("shower-tray-tiled", "Душевой поддон из плитки с трапом", "showerTrayTiled", "шт", 20000, 12000, 2500, 0, "Санузел", "Сан v1"),
  row("shower-cabin", "Душевая кабина", "showerCabin", "шт", 10000, 5000, 1000, 37000, "Санузел", "Сан v1"),
  row("shower-drain", "Душевой трап", "showerDrain (с оборудованием)", "шт", 12000, 7000, 2000, 15000, "Санузел", "Сан v1"),
  row("shower-mixer-rail", "Душевой смеситель / душевая стойка", "showerMixerRail", "шт", 2500, 1500, 500, 12000, "Санузел", "Сан v1"),
  row("shower-mixer-concealed", "Душевой смеситель / скрытый монтаж", "showerMixerConcealed; встроенный с тропическим душем", "шт", 12000, 3000, 500, 37000, "Санузел", "Сан v1"),
  row("shower-mixer-thermostatic", "Термостатический смеситель для душа", "showerMixerThermostatic", "шт", 4500, 2000, 500, 22000, "Санузел", "Сан v1"),
  row("concealed-mixer", "Скрытый смеситель / встроенный монтаж", "concealedMixer", "шт", 9000, 4500, 1000, 25000, "Санузел", "Сан v1"),
  row("hygienic-shower", "Гигиенический душ", "hygienicShower", "шт", 3500, 1500, 500, 9000, "Санузел", "код"),
  row("electric-towel-rail", "Электрический полотенцесушитель", "electricTowelRail", "шт", 4000, 1500, 500, 15000, "Санузел", "код"),
  row("bathroom-mirror", "Зеркало в санузле", "bathroomMirror", "шт", 1500, 500, 300, 15000, "Санузел", "Сан v1"),

  // C.2. Кухня
  row("kitchen-sink", "Кухонная мойка", "kitchenSink; legacy / не использовать в зонах — разбит на атомы (точки + трубы + работы)", "шт", 6500, 3500, 1500, 0, "Кухня", "код"),
  row("kitchen-sink-siphon", "Сифон для кухонной мойки", "kitchenSinkSiphon", "шт", 1500, 2500, 500, 0, "Кухня", "код"),
  row("kitchen-siphon-dishwasher", "Сифон кухонный с отводом под ПММ", "kitchenSiphonDishwasher", "шт", 1800, 3000, 500, 0, "Кухня", "Сан v1"),
  row("disposer-output", "Вывод под измельчитель", "disposerOutput", "шт", 2500, 2000, 500, 0, "Кухня", "Сан v1"),
  row("food-disposer", "Измельчитель пищевых отходов", "foodDisposer", "шт", 3500, 1500, 500, 18000, "Кухня", "Сан v1"),
  row("drinking-water-filter", "Фильтр питьевой воды / вывод", "drinkingWaterFilter; очистка воды", "шт", 3500, 2500, 800, 13000, "Кухня", "Сан v1"),
  row("dishwasher-outputs-alt", "Выводы под посудомоечную машину", "dishwasherOutputsAlt", "шт", 6500, 3500, 1500, 0, "Кухня", "Сан v1"),
  row("drain-clamp-filter", "Дренажный хомут / подключение фильтра к канализации", "drainClampFilter", "шт", 1200, 1200, 300, 0, "Кухня", "Сан v1"),

  // C.3. Тех. зона
  row("dishwasher-output", "Выводы для ПМ машины", "dishwasherOutput", "шт", 5500, 3000, 1000, 0, "Тех. зона", "код"),
  row("washer-dryer-output", "Выводы стиральная / сушильная машина", "washerDryerOutput", "шт", 6500, 3500, 1500, 0, "Тех. зона", "код"),
  row("washer-siphon-output", "Сифон / вывод для стиральной машины", "washerSiphonOutput", "шт", 1500, 1800, 500, 0, "Тех. зона", "Сан v1"),

  // C.4. Узел
  row("water-collector", "Коллектор ХВС / ГВС", "waterCollector", "шт", 10000, 28000, 3000, 0, "Узел", "код"),
  row("water-filters", "Фильтры водоснабжения", "waterFilters", "шт", 5000, 18000, 1500, 0, "Узел", "код"),
  row("pressure-reducer", "Редуктор давления ХВС / ГВС", "pressureReducer", "шт", 3500, 8000, 1000, 0, "Узел", "Сан v1"),
  row("pressure-gauges", "Манометры", "pressureGauges", "шт", 1000, 2500, 300, 0, "Узел", "Сан v1"),
  row("check-valves", "Обратные клапаны", "checkValves", "шт", 1500, 2500, 500, 0, "Узел", "Сан v1"),
  row("collector-cabinet", "Шкаф коллекторный / сантехнический короб", "collectorCabinet", "шт", 4500, 8000, 1000, 0, "Узел", "Сан v1"),
  row("leak-protection", "Система защиты от протечек", "leakProtection; датчики и перекрытие воды", "шт", 9000, 8000, 1500, 45000, "Узел", "код"),
  row("revision-hatch", "Скрытый ревизионный люк", "revisionHatch", "шт", 3500, 7000, 500, 0, "Узел", "Сан v1"),
  row("water-heater-storage", "Водонагреватель накопительный", "waterHeaterStorage", "шт", 7000, 3500, 1000, 25000, "Узел", "Сан v1"),
  row("water-heater-flow", "Водонагреватель проточный", "waterHeaterFlow", "шт", 6000, 3000, 1000, 15000, "Узел", "Сан v1"),

  // C.5. Доп.
  row("shutoff-valves", "Отсечные краны", "shutoffValves; кол-во = max(4, ХВС+ГВС точек)", "шт", 500, 850, 100, 0, "Доп.", "код"),
  row("cold-hot-water-point", "Дополнительная точка ХВС / ГВС", "coldHotWaterPoint", "шт", 4500, 3000, 1000, 0, "Доп.", "Сан v1"),
  row("extra-sewer-point", "Дополнительная точка канализации", "extraSewerPoint", "шт", 4500, 2500, 1000, 0, "Доп.", "Сан v1"),

  // C.6. Расходники
  row("siphon-connection-reserve", "Сифон / комплект подключения (резерв)", "siphonConnectionReserve", "комплект", 1500, 2500, 500, 0, "Расходники", "Сан v1"),
  row("sink-pop-up-waste", "Донный клапан / выпуск для раковины", "sinkPopUpWaste", "шт", 800, 1200, 300, 0, "Расходники", "Сан v1"),
  row("sink-siphon", "Сифон для раковины", "sinkSiphon", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),
  row("vanity-sink-siphon", "Сифон для тумбы с раковиной", "vanitySinkSiphon", "шт", 1500, 2000, 500, 0, "Расходники", "Сан v1"),
  row("bath-siphon-overflow", "Сифон для ванны / слив-перелив", "bathSiphonOverflow", "шт", 1500, 2500, 500, 0, "Расходники", "Сан v1"),
  row("shower-tray-siphon", "Сифон для душевого поддона", "showerTraySiphon", "шт", 2000, 2500, 500, 0, "Расходники", "Сан v1"),
  row("shower-drain-trap", "Трап душевой с гидрозатвором", "showerDrainTrap", "шт", 3500, 8000, 1000, 0, "Расходники", "Сан v1"),
  row("fan-outlet-cuff-toilet", "Фановый отвод / манжета для унитаза", "fanOutletCuffToilet", "шт", 1500, 1500, 500, 0, "Расходники", "Сан v1"),
  row("fan-outlet-cuff-install", "Фановый отвод / манжета для инсталляции", "fanOutletCuffInstall", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),
  row("bidet-siphon", "Сифон / выпуск для биде", "bidetSiphon", "шт", 1500, 1800, 500, 0, "Расходники", "Сан v1"),

  // C.7. Отопление (вне сантех-сценариев, но присутствует в Сан v1)
  row("radiator-replacement", "Замена радиатора отопительного (диз.)", "radiatorReplacement", "шт", 6000, 20000, 1200, 5000, "Отопление", "Сан v1"),

  // === Кубики-РАБОТЫ из сметы работ (единичные расценки). Чистая работа: works=цена, остальное 0. ===
  // Принцип: работа и материал — отдельные кубики; "монтаж точки" ≠ "монтаж прибора".

  // Работы · ХВС/ГВС
  row("work-water-point", "Монтаж точки ХВС/ГВС", "работа; точка водоснабжения", "шт", 3500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-water-rosette-valves", "Монтаж кранов водорозеток", "работа", "шт", 400, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-hygienic-shower-rough", "Монтаж встроенного гигиенического душа (черновой)", "работа; черновой этап", "шт", 4500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-meter-relocation-130", "Перенос счётчика на высоту 130 см", "работа", "усл.", 1800, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-hygienic-shower-finish", "Монтаж гигиенического душа (чистовой)", "работа; чистовой этап", "шт", 1000, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-shower-mixer-install", "Монтаж душевого смесителя", "работа", "шт", 1500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-vanity-sink-faucet-install", "Монтаж раковины на тумбе со смесителем", "работа", "шт", 4000, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),
  row("work-sink-mixer-siphon-connect", "Подключение смесителя и сифона мойки", "работа", "шт", 1500, 0, 0, 0, "Работы · ХВС/ГВС", "Смета работ"),

  // Работы · Канализация
  row("work-sewer-point", "Монтаж точки канализации", "работа; точка канализации", "шт", 2500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
  row("work-install-frame-rough", "Монтаж инсталляции с подключением к сетям (черновой)", "работа; черновой этап", "шт", 6500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
  row("work-wall-toilet-finish", "Монтаж подвесного унитаза (чистовой)", "работа; чистовой этап", "шт", 3000, 0, 0, 0, "Работы · Канализация", "Смета работ"),
  row("work-dishwasher-connect", "Подключение посудомойки", "работа", "шт", 500, 0, 0, 0, "Работы · Канализация", "Смета работ"),
  row("work-washer-install-connect", "Установка и подключение стиральной машины", "работа", "шт", 1500, 0, 0, 0, "Работы · Канализация", "Смета работ"),

  // Трассы / подготовка (работы)
  row("work-wall-chase", "Штробление стены", "работа", "м.п.", 900, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
  row("work-floor-opening", "Вскрытие пола", "работа", "м.п.", 600, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
  row("work-slab-glue-mount", "Монтаж плиты на клей", "работа", "шт", 900, 0, 0, 0, "Трассы / подготовка", "Смета работ"),
  row("work-risers-restore", "Восстановление стояков", "работа", "усл.", 1500, 0, 0, 0, "Трассы / подготовка", "Смета работ"),

  // Тёплый пол / отопление — ОТДЕЛЬНЫЙ МОДУЛЬ, не смешивать с сантехникой
  row("work-warm-floor-chase", "Монтаж тёплого пола в штробу с заделкой", "работа; отдельный модуль, не смешивать с сантехникой", "м²", 1600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),
  row("work-radiator-demolition", "Демонтаж радиатора с заглушиванием выводов", "работа; отдельный модуль, не смешивать с сантехникой", "шт", 1600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),
  row("work-radiator-thermo-reconnect", "Демонтаж труб радиатора, установка терморегулятора, подключение", "работа; отдельный модуль, не смешивать с сантехникой", "усл.", 4600, 0, 0, 0, "Тёплый пол / отопление", "Смета работ"),

  // === Кубики-МАТЕРИАЛЫ (трубы): materials=цена, остальное 0. Цены подтверждены пользователем. ===
  row("pipe-sewer-110", "Труба канализационная 110 мм", "материал; Бауцентр/Cosmoplast", "м.п.", 0, 240, 0, 0, "Трассы / подготовка", "Бауцентр/Cosmoplast"),
  row("pipe-sewer-50", "Труба канализационная 50 мм", "материал; Бауцентр/Cosmoplast", "м.п.", 0, 155, 0, 0, "Трассы / подготовка", "Бауцентр/Cosmoplast"),
  row("pipe-ppr-d20", "Труба PPR d20", "материал; VALFEX; 10 м.п. на водяную точку (ХВС+ГВС = ×2); Санта-Сервис", "м.п.", 0, 115, 0, 0, "Трассы / подготовка", "Санта-Сервис"),
  row("kit-ppr-d20-40m", "Комплект PPR d20 (~40 м + фитинги)", "типовой комплект на квартиру, остаётся 2–3 трубы; Санта-Сервис", "комплект", 0, 4836.87, 0, 0, "Узел", "Санта-Сервис"),
];

export const CATALOG_GROUPS: CatalogGroup[] = [
  "Санузел",
  "Кухня",
  "Тех. зона",
  "Узел",
  "Доп.",
  "Расходники",
  "Отопление",
  "Работы · ХВС/ГВС",
  "Работы · Канализация",
  "Трассы / подготовка",
  "Тёплый пол / отопление",
];

// --- Иерархия зон (подгруппа → зона → состав) ---
// Зона не хранит собственную цену: она ссылается на атомарные позиции библиотеки
// по id и агрегирует их (Σ цена позиции × qty × коэффициент строки состава).

export type ZoneSubgroup = "Кухня" | "Санузел" | "Узел" | "Тех. зона" | "Доп.";

export type ZoneCompositionRow = {
  atomicItemId: string;
  quantity: number;
  coefficient?: number;
};

export type CatalogZone = {
  id: string;
  subgroup: ZoneSubgroup;
  title: string;
  description?: string;
  items: ZoneCompositionRow[];
};

// Фиксированный список подгрупп для иерархии зон.
export const ZONE_SUBGROUPS: ZoneSubgroup[] = ["Кухня", "Санузел", "Узел", "Тех. зона", "Доп."];

// Человеческие подписи подгрупп (значение остаётся коротким для совместимости с group).
export const ZONE_SUBGROUP_LABELS: Record<ZoneSubgroup, string> = {
  "Кухня": "Кухня",
  "Санузел": "Санузел",
  "Узел": "Инженерный узел",
  "Тех. зона": "Тех. зона",
  "Доп.": "Доп.",
};

// Демо-зоны: только ссылки на существующие позиции библиотеки, без выдуманных цен.
export const ZONES_SEED: CatalogZone[] = [
  {
    id: "zone-kitchen-sink",
    subgroup: "Кухня",
    title: "Зона мойки",
    description:
      "Атомарная сборка: точки ХВС/ГВС и канализации, подключение, сифон, трубы (PPR 20 м = 10 м × 2 точки; канализация 50 мм 3,5 м.п.). Смеситель кухонный — цена пока не задана, не включён.",
    items: [
      { atomicItemId: "work-water-point", quantity: 1 },
      { atomicItemId: "work-sewer-point", quantity: 1 },
      { atomicItemId: "work-sink-mixer-siphon-connect", quantity: 1 },
      { atomicItemId: "kitchen-sink-siphon", quantity: 1 },
      { atomicItemId: "pipe-sewer-50", quantity: 3.5 },
      { atomicItemId: "pipe-ppr-d20", quantity: 20 },
    ],
  },
  {
    id: "zone-bathroom-vanity",
    subgroup: "Санузел",
    title: "Зона умывальника",
    description: "Тумба с раковиной, смеситель и сифон.",
    items: [
      { atomicItemId: "vanity-sink-set", quantity: 1 },
      { atomicItemId: "sink-faucet", quantity: 1 },
      { atomicItemId: "vanity-sink-siphon", quantity: 1 },
    ],
  },
];

export const CATALOG_CATEGORIES: CatalogCategory[] = ["works", "materials", "equipment", "consumables"];

export const CATALOG_UNITS: CatalogUnit[] = ["шт", "м.п.", "м²", "комплект", "усл."];

export const CATALOG_SOURCES: CatalogSource[] = [
  "Сан v1",
  "код",
  "вручную",
  "Смета работ",
  "Бауцентр/Cosmoplast",
  "Санта-Сервис",
];
