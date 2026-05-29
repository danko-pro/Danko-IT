import { describe, expect, it } from "vitest";

import {
  calculateDishwasherZone,
  calculateInstallRelocationZone,
  calculateKitchenSinkZone,
  calculateKitchenSinkZoneTotal,
  calculateShowerZone,
  calculateZone,
  calculateZoneTotal,
  expandPlumbingSectionForSpec,
  getDishwasherZoneSpecItems,
  getInstallRelocationZoneSpecItems,
  getKitchenSinkZonePackageTotal,
  getKitchenSinkZoneSpecItems,
  getShowerZoneSpecItems,
  getZoneSpecItems,
  isPlumbingZoneSpecLine,
  isSinkZoneContaminantLine,
  KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS,
  KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS,
  PLUMBING_ZONE_IDS,
  sumKitchenSinkZoneSpecLines,
} from "./public-estimate-plumbing-zones";

import { calculatePlumbing } from "./public-estimate-plumbing";

const KITCHEN_ROOM = [
  {
    roomId: "kitchen",
    roomName: "Кухня",
    roomType: "kitchen" as const,
    area: 12,
  },
];

const BATHROOM_ROOM = [
  {
    roomId: "bathroom",
    roomName: "Санузел",
    roomType: "bathroom" as const,
    area: 4.3,
  },
];

const PLUMBING_SINK_ONLY_OPTIONS = {
  includeBathroomSet: false,

  includeBath: false,

  includeHygienicShower: false,

  includeElectricTowelRail: false,

  includeKitchenSink: true,

  kitchenSinkPackageLevel: "c" as const,

  includeDishwasherOutput: false,

  dishwasherPackageLevel: "b" as const,

  includeShowerZone: false,

  showerPackageLevel: "b" as const,

  includeInstallRelocation: false,

  includeWasherOutput: false,

  includeWaterNode: false,

  includeLeakProtection: false,
};

describe("calculateKitchenSinkZone", () => {
  it("считает базу, пакет B и резерв 6,4% по эталону catalog-editor", () => {
    const result = calculateKitchenSinkZone("b");

    expect(result.baseTotal).toBe(24612);

    expect(result.packageTotal).toBe(16300);

    expect(result.subtotal).toBe(40912);

    expect(result.riskAmount).toBe(2618);

    expect(result.total).toBe(43530);

    expect(result.sectionItem.id).toBe("kitchen-sink-zone");

    expect(result.sectionItem.total).toBe(43530);

    expect(result.specItems).toHaveLength(13);
  });

  it("даёт разные итоги для пакетов C и A", () => {
    const packageC = getKitchenSinkZonePackageTotal("c");

    const packageA = getKitchenSinkZonePackageTotal("a");

    expect(packageC).toBeLessThan(getKitchenSinkZonePackageTotal("b"));

    expect(packageA).toBeGreaterThan(getKitchenSinkZonePackageTotal("b"));

    expect(packageC).toBe(39487);

    expect(packageA).toBe(54915);
  });

  it("пакет C: subtotal 37112 (база 24612 + смеситель 6000 + мойка 6500)", () => {
    const result = calculateKitchenSinkZone("c");

    expect(result.baseTotal).toBe(24612);

    expect(result.packageTotal).toBe(12500);

    expect(result.subtotal).toBe(37112);

    expect(result.riskAmount).toBe(2375);

    expect(result.total).toBe(39487);

    expect(calculateKitchenSinkZoneTotal("c")).toBe(result.total);
  });
});

describe("getKitchenSinkZoneSpecItems", () => {
  it("возвращает 11 базовых атомов + 2 позиции пакета B без строки резерва", () => {
    const specItems = getKitchenSinkZoneSpecItems("b");

    expect(specItems).toHaveLength(13);

    expect(
      specItems.some((item) => item.title.toLowerCase().includes("резерв")),
    ).toBe(false);

    expect(sumKitchenSinkZoneSpecLines(specItems)).toBe(40912);

    expect(getKitchenSinkZonePackageTotal("b")).toBe(43530);

    expect(
      specItems.some((item) => item.title === "Смеситель кухонный — пакет B"),
    ).toBe(true);

    expect(
      specItems.some((item) => item.title === "Штробление под трубу"),
    ).toBe(true);
  });

  it("для пакета B включает мойку из состава пакета (как в catalog-editor)", () => {
    const specItems = getKitchenSinkZoneSpecItems("b");

    const sink = specItems.find(
      (item) => item.title === "Мойка кухонная — пакет B",
    );

    expect(sink).toBeDefined();

    expect(sink?.total).toBe(0);

    expect(sink?.note).toBe("уточняется");
  });

  it("пакет C: мойка 6500, смеситель 6000, без ПММ/dishwasher", () => {
    const specItems = getKitchenSinkZoneSpecItems("c");

    const faucet = specItems.find(
      (item) => item.title === "Смеситель для мойки — C",
    );

    const sink = specItems.find((item) => item.title === "Кухонная мойка — C");

    expect(specItems).toHaveLength(13);

    expect(faucet).toBeDefined();

    expect(faucet?.total).toBe(6000);

    expect(faucet?.note).toBeUndefined();

    expect(sink).toBeDefined();

    expect(sink?.total).toBe(6500);

    expect(sink?.note).toBeUndefined();

    const dishwasherPattern = /пмм|посудом|dishwasher/i;

    expect(specItems.some((item) => dishwasherPattern.test(item.title))).toBe(
      false,
    );

    expect(specItems.some((item) => item.id.includes("dishwasher"))).toBe(
      false,
    );

    expect(specItems.every((item) => !isSinkZoneContaminantLine(item))).toBe(
      true,
    );

    expect(sumKitchenSinkZoneSpecLines(specItems)).toBe(37112);

    expect(calculateKitchenSinkZoneTotal("c")).toBe(39487);
  });

  it("состав spec совпадает с seed zone-kitchen-sink", () => {
    const specItems = getKitchenSinkZoneSpecItems("c");

    const atomIds = specItems.map((item) =>
      item.id.replace(/^kitchen-sink-zone-/, ""),
    );

    expect(atomIds).toEqual([
      ...KITCHEN_SINK_ZONE_BASE_ATOMIC_IDS,

      ...KITCHEN_SINK_ZONE_PACKAGE_ATOMIC_IDS.c,
    ]);
  });
});

describe("calculateDishwasherZone", () => {
  it("считает базу ПММ из seed с резервом 6,4%", () => {
    const result = calculateDishwasherZone("b");

    expect(result.baseTotal).toBe(13777);

    expect(result.packageTotal).toBe(0);

    expect(result.subtotal).toBe(13777);

    expect(result.riskAmount).toBe(882);

    expect(result.total).toBe(14659);

    expect(result.sectionItem.id).toBe("kitchen-dishwasher-zone");
  });

  it("spec ПММ не содержит атомов мойки", () => {
    const specItems = getDishwasherZoneSpecItems("b");

    const sinkPattern = /кухонн.*мойк|kitchen-sink/i;

    expect(specItems.some((item) => sinkPattern.test(item.title))).toBe(false);

    expect(
      specItems.some((item) => item.id.startsWith("kitchen-sink-zone-")),
    ).toBe(false);

    expect(
      specItems.some((item) => item.title === "Подключение посудомойки"),
    ).toBe(true);
  });
});

describe("calculateShowerZone", () => {
  it("считает душевую зону пакета B из seed", () => {
    const result = calculateShowerZone("b");

    expect(result.baseTotal).toBe(50469);

    expect(result.packageTotal).toBe(56500);

    expect(result.subtotal).toBe(106969);

    expect(result.riskAmount).toBe(6846);

    expect(result.total).toBe(113815);

    expect(result.sectionItem.id).toBe("bathroom-shower-zone");
  });

  it("spec душевой зоны не содержит атомов мойки и ПММ", () => {
    const specItems = getShowerZoneSpecItems("b");

    expect(specItems.some((item) => item.id.includes("kitchen-sink"))).toBe(
      false,
    );

    expect(specItems.some((item) => item.id.includes("dishwasher"))).toBe(
      false,
    );

    expect(specItems.some((item) => item.title === "Душ (выводы)")).toBe(true);
  });
});

describe("calculateInstallRelocationZone", () => {
  it("считает перенос инсталляции без пакетов C/B/A", () => {
    const result = calculateInstallRelocationZone();

    expect(result.baseTotal).toBe(31507);

    expect(result.packageTotal).toBe(0);

    expect(result.subtotal).toBe(31507);

    expect(result.riskAmount).toBe(2016);

    expect(result.total).toBe(33523);

    expect(result.sectionItem.id).toBe("bathroom-install-relocation-zone");
  });

  it("spec переноса не содержит строки резерва 6,4%", () => {
    const specItems = getInstallRelocationZoneSpecItems();

    expect(
      specItems.some((item) => item.title.toLowerCase().includes("резерв")),
    ).toBe(false);

    expect(specItems.reduce((sum, item) => sum + item.total, 0)).toBe(31507);
  });
});

describe("calculateZone registry API", () => {
  it("calculateZoneTotal совпадает с calculateZone для всех seed-зон", () => {
    expect(calculateZoneTotal(PLUMBING_ZONE_IDS.KITCHEN_SINK, "b")).toBe(
      calculateZone(PLUMBING_ZONE_IDS.KITCHEN_SINK, "b").total,
    );

    expect(calculateZoneTotal(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER, "b")).toBe(
      calculateZone(PLUMBING_ZONE_IDS.KITCHEN_DISHWASHER, "b").total,
    );

    expect(calculateZoneTotal(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, "c")).toBe(
      calculateZone(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, "c").total,
    );
  });

  it("getZoneSpecItems возвращает только атомы своей зоны", () => {
    const showerSpec = getZoneSpecItems(PLUMBING_ZONE_IDS.BATHROOM_SHOWER, "a");

    expect(
      showerSpec.every((item) => item.id.startsWith("bathroom-shower-zone-")),
    ).toBe(true);

    expect(showerSpec.every((item) => isPlumbingZoneSpecLine(item))).toBe(true);
  });
});

describe("expandPlumbingSectionForSpec", () => {
  it("подставляет атомы мойки и disclaimer, сохраняя итог раздела с резервом", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      kitchenSinkPackageLevel: "b",
    });

    const expanded = expandPlumbingSectionForSpec(result.section, {
      kitchenSinkPackageLevel: "b",

      includeKitchenSink: true,

      includeDishwasher: false,
    });

    expect(expanded.specIntro).toContain("без проекта");

    expect(
      expanded.items.some((item) =>
        item.title.toLowerCase().includes("резерв"),
      ),
    ).toBe(false);

    expect(
      expanded.items.filter((item) => item.id.startsWith("kitchen-sink-zone-")),
    ).toHaveLength(13);

    expect(
      expanded.items.some((item) => item.title === "Мойка кухонная — пакет B"),
    ).toBe(true);

    expect(expanded.totals.total).toBe(result.total);

    expect(
      sumKitchenSinkZoneSpecLines(
        expanded.items.filter((item) =>
          item.id.startsWith("kitchen-sink-zone-"),
        ),
      ),
    ).toBe(40912);
  });

  it("не смешивает legacy dishwasher-output с spec зоны мойки", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      includeDishwasherOutput: true,
    });

    const expanded = expandPlumbingSectionForSpec(result.section, {
      kitchenSinkPackageLevel: "c",

      includeKitchenSink: true,

      dishwasherPackageLevel: "b",

      includeDishwasher: true,
    });

    const sinkLines = expanded.items.filter((item) =>
      item.id.startsWith("kitchen-sink-zone-"),
    );

    const dishwasherPattern = /пмм|посудом|dishwasher/i;

    expect(sinkLines).toHaveLength(13);

    expect(sinkLines.some((item) => dishwasherPattern.test(item.title))).toBe(
      false,
    );

    expect(
      expanded.items.some((item) => item.id.startsWith("dishwasher-output")),
    ).toBe(false);

    expect(
      expanded.items.some((item) =>
        item.id.startsWith("kitchen-dishwasher-zone-"),
      ),
    ).toBe(true);
  });

  it("разворачивает душевую зону и перенос инсталляции без cross-zone leak", () => {
    const result = calculatePlumbing(BATHROOM_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      includeKitchenSink: false,

      includeShowerZone: true,

      showerPackageLevel: "b",

      includeInstallRelocation: true,
    });

    const expanded = expandPlumbingSectionForSpec(result.section, {
      kitchenSinkPackageLevel: "b",

      includeKitchenSink: false,

      includeShower: true,

      showerPackageLevel: "b",

      includeInstallRelocation: true,
    });

    expect(
      expanded.items.some((item) =>
        item.id.startsWith("bathroom-shower-zone-"),
      ),
    ).toBe(true);

    expect(
      expanded.items.some((item) =>
        item.id.startsWith("bathroom-install-relocation-zone-"),
      ),
    ).toBe(true);

    expect(
      expanded.items.some((item) => item.id.startsWith("kitchen-sink-zone-")),
    ).toBe(false);

    expect(expanded.totals.total).toBe(result.total);
  });
});

describe("calculatePlumbing kitchen sink zone", () => {
  it("добавляет зону мойки вместо legacy-позиций кухонной мойки", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      kitchenSinkPackageLevel: "b",
    });

    expect(result.total).toBe(43530);

    expect(
      result.section.items.some((item) => item.id === "kitchen-sink-zone"),
    ).toBe(true);

    expect(
      result.section.items.some((item) => item.id === "kitchen-sink-works"),
    ).toBe(false);

    expect(result.coldWaterPoints).toBe(1);

    expect(result.hotWaterPoints).toBe(1);

    expect(result.sewerPoints).toBe(1);
  });

  it("добавляет зону ПММ из seed вместо legacy dishwasher-output", () => {
    const result = calculatePlumbing(KITCHEN_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      includeDishwasherOutput: true,
    });

    expect(
      result.section.items.some(
        (item) => item.id === "kitchen-dishwasher-zone",
      ),
    ).toBe(true);

    expect(
      result.section.items.some((item) =>
        item.id.startsWith("dishwasher-output"),
      ),
    ).toBe(false);

    expect(calculateDishwasherZone("b").total).toBeGreaterThan(0);
  });

  it("не добавляет legacy ванну при включённой душевой зоне", () => {
    const result = calculatePlumbing(BATHROOM_ROOM, {
      ...PLUMBING_SINK_ONLY_OPTIONS,

      includeBath: true,

      includeShowerZone: true,

      showerPackageLevel: "b",
    });

    expect(
      result.section.items.some((item) => item.id.startsWith("acrylic-bath")),
    ).toBe(false);

    expect(
      result.section.items.some((item) => item.id === "bathroom-shower-zone"),
    ).toBe(true);
  });
});
