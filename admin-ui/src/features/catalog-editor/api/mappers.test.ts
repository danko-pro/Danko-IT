import { describe, expect, it } from "vitest";

import type { CatalogItem, CatalogZone } from "../plumbing-seed";
import {
  catalogItemToPayload,
  dtoToCatalogItem,
  dtoZoneToCatalogZone,
  isEmptyPlan,
  planCatalogSync,
  zoneItemsToPayload,
  zonePackagesToPayload,
  zoneToPayload,
} from "./mappers";
import type { PlumbingCatalogItemDto, PlumbingZoneDto } from "./types";

function makeItemDto(overrides: Partial<PlumbingCatalogItemDto> = {}): PlumbingCatalogItemDto {
  return {
    id: 1,
    source_code: "work-water-point",
    public_title: "Монтаж точки ХВС/ГВС",
    technical_title: "internal",
    category: "works",
    unit: "шт",
    work_price: 3500,
    material_price: 0,
    equipment_price: 0,
    consumables_price: 0,
    coefficient: 1,
    catalog_group: "Работы · ХВС/ГВС",
    source: "Смета работ",
    note: null,
    is_active: 1,
    sort_order: 100,
    ...overrides,
  };
}

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: "work-water-point",
    publicTitle: "Монтаж точки ХВС/ГВС",
    technicalTitle: "",
    category: "works",
    unit: "шт",
    works: 3500,
    materials: 0,
    equipment: 0,
    consumables: 0,
    coefficient: 1,
    group: "Работы · ХВС/ГВС",
    source: "Смета работ",
    ...overrides,
  };
}

function makeZone(overrides: Partial<CatalogZone> = {}): CatalogZone {
  return {
    id: "zone-kitchen-sink",
    subgroup: "Кухня",
    title: "Зона мойки",
    description: "desc",
    riskPercent: 6.4,
    items: [{ atomicItemId: "work-water-point", quantity: 1 }],
    priceClassVariants: [
      { id: "b", label: "Пакет B", items: [{ atomicItemId: "kitchen-faucet-b", quantity: 1 }] },
    ],
    activePriceClassId: "b",
    ...overrides,
  };
}

describe("dtoToCatalogItem", () => {
  it("маппит цены/категории и подставляет дефолты для невалидных значений", () => {
    const item = dtoToCatalogItem(
      makeItemDto({ category: "unknown", unit: "??", catalog_group: null, source: null, coefficient: 0 }),
    );
    expect(item.id).toBe("work-water-point");
    expect(item.works).toBe(3500);
    expect(item.category).toBe("materials"); // невалидная категория → дефолт
    expect(item.unit).toBe("шт");
    expect(item.group).toBe("Доп.");
    expect(item.source).toBe("вручную");
    expect(item.coefficient).toBe(1); // 0 → 1
  });
});

describe("dtoZoneToCatalogZone", () => {
  it("собирает зону, состав и пакеты C/B/A", () => {
    const dto: PlumbingZoneDto = {
      id: 10,
      zone_code: "zone-kitchen-sink",
      subgroup: "Кухня",
      title: "Зона мойки",
      description: "desc",
      disclaimer: null,
      risk_percent: 6.4,
      active_package_code: "b",
      is_active: 1,
      sort_order: 10,
      base: [
        { atomic_item_id: 1, atomic_source_code: "work-water-point", quantity: 1, coefficient: 1, sort_order: 10 },
        { atomic_item_id: 2, atomic_source_code: "pipe-ppr-d20", quantity: 20, coefficient: 1, sort_order: 20 },
      ],
      packages: [
        {
          id: 5,
          zone_id: 10,
          package_code: "b",
          label: "Пакет B",
          sort_order: 10,
          items: [
            { atomic_item_id: 3, atomic_source_code: "kitchen-faucet-b", quantity: 1, coefficient: 1, sort_order: 10 },
          ],
        },
      ],
    };
    const zone = dtoZoneToCatalogZone(dto);
    expect(zone.id).toBe("zone-kitchen-sink");
    expect(zone.items).toHaveLength(2);
    expect(zone.items[0]).toEqual({ atomicItemId: "work-water-point", quantity: 1, coefficient: undefined });
    expect(zone.priceClassVariants).toHaveLength(1);
    expect(zone.activePriceClassId).toBe("b");
    expect(zone.priceClassVariants?.[0].items[0].atomicItemId).toBe("kitchen-faucet-b");
  });

  it("без пакетов оставляет priceClassVariants undefined", () => {
    const dto: PlumbingZoneDto = {
      id: 11,
      zone_code: "zone-flat",
      subgroup: "Доп.",
      title: "Плоская зона",
      description: null,
      disclaimer: null,
      risk_percent: 6.4,
      active_package_code: null,
      is_active: 1,
      sort_order: 10,
      base: [],
      packages: [],
    };
    const zone = dtoZoneToCatalogZone(dto);
    expect(zone.priceClassVariants).toBeUndefined();
    expect(zone.activePriceClassId).toBeUndefined();
  });
});

describe("payload builders", () => {
  it("catalogItemToPayload переносит works/materials в *_price", () => {
    const payload = catalogItemToPayload(
      makeItem({ works: 2500, materials: 1300, equipment: 12000, consumables: 500, technicalTitle: "" }),
    );
    expect(payload.work_price).toBe(2500);
    expect(payload.material_price).toBe(1300);
    expect(payload.equipment_price).toBe(12000);
    expect(payload.consumables_price).toBe(500);
    expect(payload.technical_title).toBeNull();
    expect(payload.source_code).toBe("work-water-point");
  });

  it("zoneToPayload отдаёт risk_percent и active_package_code", () => {
    const payload = zoneToPayload(makeZone());
    expect(payload.zone_code).toBe("zone-kitchen-sink");
    expect(payload.risk_percent).toBe(6.4);
    expect(payload.active_package_code).toBe("b");
  });

  it("zoneItemsToPayload резолвит atomic_item_id из карты source_code→id", () => {
    const idMap = new Map<string, number>([["work-water-point", 1]]);
    const payload = zoneItemsToPayload(makeZone(), idMap);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].atomic_source_code).toBe("work-water-point");
    expect(payload.items[0].atomic_item_id).toBe(1);
    expect(payload.items[0].coefficient).toBe(1);
  });

  it("zonePackagesToPayload собирает пакеты с составом", () => {
    const idMap = new Map<string, number>([["kitchen-faucet-b", 3]]);
    const payload = zonePackagesToPayload(makeZone(), idMap);
    expect(payload.packages).toHaveLength(1);
    expect(payload.packages[0].package_code).toBe("b");
    expect(payload.packages[0].items[0].atomic_item_id).toBe(3);
  });
});

describe("planCatalogSync", () => {
  it("пустой план, когда состояние не изменилось", () => {
    const snapshot = { items: [makeItem()], zones: [makeZone()] };
    const clone = { items: [makeItem()], zones: [makeZone()] };
    expect(isEmptyPlan(planCatalogSync(snapshot, clone))).toBe(true);
  });

  it("обнаруживает создание/обновление/удаление атомов", () => {
    const prev = { items: [makeItem(), makeItem({ id: "old", publicTitle: "Старый" })], zones: [] };
    const next = {
      items: [makeItem({ works: 9999 }), makeItem({ id: "new", publicTitle: "Новый" })],
      zones: [],
    };
    const plan = planCatalogSync(prev, next);
    expect(plan.itemsToCreate.map((i) => i.id)).toEqual(["new"]);
    expect(plan.itemsToUpdate.map((i) => i.id)).toEqual(["work-water-point"]);
    expect(plan.itemSourceCodesToDelete).toEqual(["old"]);
  });

  it("разделяет изменения метаданных, состава и пакетов зоны", () => {
    const prev = { items: [], zones: [makeZone()] };
    const metaOnly = planCatalogSync(prev, { items: [], zones: [makeZone({ title: "Иначе" })] });
    expect(metaOnly.zonesToUpdateMeta).toHaveLength(1);
    expect(metaOnly.zonesToReplaceItems).toHaveLength(0);
    expect(metaOnly.zonesToReplacePackages).toHaveLength(0);

    const itemsChanged = planCatalogSync(prev, {
      items: [],
      zones: [makeZone({ items: [{ atomicItemId: "work-water-point", quantity: 2 }] })],
    });
    expect(itemsChanged.zonesToReplaceItems).toHaveLength(1);
    expect(itemsChanged.zonesToUpdateMeta).toHaveLength(0);

    const packagesChanged = planCatalogSync(prev, {
      items: [],
      zones: [
        makeZone({
          priceClassVariants: [
            { id: "b", label: "Пакет B", items: [{ atomicItemId: "kitchen-faucet-a", quantity: 1 }] },
          ],
        }),
      ],
    });
    expect(packagesChanged.zonesToReplacePackages).toHaveLength(1);
  });

  it("обнаруживает создание и удаление зон", () => {
    const prev = { items: [], zones: [makeZone({ id: "zone-old" })] };
    const next = { items: [], zones: [makeZone({ id: "zone-new" })] };
    const plan = planCatalogSync(prev, next);
    expect(plan.zonesToCreate.map((z) => z.id)).toEqual(["zone-new"]);
    expect(plan.zoneCodesToDelete).toEqual(["zone-old"]);
  });
});
