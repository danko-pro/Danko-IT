import { describe, expect, it } from "vitest";

import {
  buildScenarioSection,
  calculatePlumbing,
  getShowerAreaItems,
  showerAreaScenario,
  sumScenarioItems,
  toiletRelocationScenario,
  type PlumbingOptions,
  type PlumbingRoomInput,
} from "./public-estimate-plumbing";

const bathroom: PlumbingRoomInput = {
  roomId: "r1",
  roomName: "Санузел",
  roomType: "bathroom",
  area: 6,
};

function makeOptions(overrides: Partial<PlumbingOptions> = {}): PlumbingOptions {
  return {
    includeBathroomSet: false,
    includeBath: false,
    includeHygienicShower: false,
    includeElectricTowelRail: false,
    includeKitchenSink: false,
    includeDishwasherOutput: false,
    includeWasherOutput: false,
    includeWaterNode: false,
    includeLeakProtection: false,
    includeToiletRelocation: false,
    includeShowerArea: false,
    showerAreaVariant: "tiled-tray",
    ...overrides,
  };
}

describe("Сценарий «Перенос инсталляции»", () => {
  it("сумма состава = 20 300 ₽ при количестве 1/1/1", () => {
    expect(sumScenarioItems(toiletRelocationScenario.items)).toBe(20300);
  });

  it("раскрывается в атомарные строки, сумма строк = 20 300 ₽", () => {
    const section = buildScenarioSection(
      "scenario-toilet-relocation",
      toiletRelocationScenario.publicTitle,
      toiletRelocationScenario.publicDescription,
      toiletRelocationScenario.items,
    );

    expect(section.totals.total).toBe(20300);
    expect(section.items.length).toBeGreaterThan(0);
  });

  it("попадает в раздел сантехники и в итог при включении", () => {
    const result = calculatePlumbing([bathroom], makeOptions({ includeToiletRelocation: true }));
    expect(result.total).toBe(20300);
  });
});

describe("Сценарий «Душевая зона»", () => {
  it("вариант с поддоном из плитки = 147 000 ₽", () => {
    expect(sumScenarioItems(getShowerAreaItems("tiled-tray"))).toBe(147000);
  });

  it("вариант душевого уголка = 92 500 ₽", () => {
    expect(sumScenarioItems(getShowerAreaItems("enclosure"))).toBe(92500);
  });

  it("итог раздела соответствует выбранному варианту", () => {
    const tiled = calculatePlumbing(
      [bathroom],
      makeOptions({ includeShowerArea: true, showerAreaVariant: "tiled-tray" }),
    );
    expect(tiled.total).toBe(147000);

    const enclosure = calculatePlumbing(
      [bathroom],
      makeOptions({ includeShowerArea: true, showerAreaVariant: "enclosure" }),
    );
    expect(enclosure.total).toBe(92500);
  });

  it("объявляет оба варианта и конфликт с ванной", () => {
    expect(Object.keys(showerAreaScenario.variants)).toEqual(["tiled-tray", "enclosure"]);
    expect(showerAreaScenario.conflictsWith).toBe("includeBath");
  });
});

describe("Дефолты и интеграция сценариев", () => {
  it("выключенные сценарии не добавляют строк", () => {
    const result = calculatePlumbing([bathroom], makeOptions());
    expect(result.total).toBe(0);
    expect(result.section.items).toHaveLength(0);
  });

  it("сценарии добавляются поверх существующих позиций без задвоения", () => {
    const base = calculatePlumbing([bathroom], makeOptions({ includeBathroomSet: true }));
    const withRelocation = calculatePlumbing(
      [bathroom],
      makeOptions({ includeBathroomSet: true, includeToiletRelocation: true }),
    );

    expect(withRelocation.total).toBe(base.total + 20300);
  });
});
