import { describe, expect, it, vi } from "vitest";

import type { FlooringCatalogAssemblyDto } from "./api/flooring-types";
import type { CoveringAssemblyRow } from "./flooring-assembly";
import {
  FLOORING_ASSEMBLY_LOAD_FAILED_WARNING,
  loadFlooringCatalogAssemblyForEdit,
  resolveAssemblyRowsForEditor,
} from "./flooring-catalog-assembly-load";
import { catalogAssemblyDtoToDraft } from "./api/flooring-mappers";

function makeCatalogAssemblyRowDto(
  overrides: Partial<FlooringCatalogAssemblyDto["rows"][number]> = {},
): FlooringCatalogAssemblyDto["rows"][number] {
  return {
    section: "work",
    kind: "work",
    formula: "flat_per_m2",
    title: "Работа",
    unit: "m2",
    price: 100,
    consumption_per_m2: 1,
    package_size: null,
    layer_mm: null,
    sort_order: 10,
    is_enabled: true,
    public_category: "works",
    ...overrides,
  };
}

function makeCatalogAssemblyDto(overrides: Partial<FlooringCatalogAssemblyDto> = {}): FlooringCatalogAssemblyDto {
  return {
    id: 5,
    target_kind: "covering",
    target_id: 11,
    title: "Состав покрытия",
    version: "flooring-assembly-v1",
    rows: [makeCatalogAssemblyRowDto()],
    ...overrides,
  };
}

describe("resolveAssemblyRowsForEditor", () => {
  it("маппит DTO draft в строки блока сборки", () => {
    const draft = catalogAssemblyDtoToDraft(makeCatalogAssemblyDto());
    const rows = resolveAssemblyRowsForEditor(draft);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Работа");
    expect(rows[0].kind).toBe("work");
    expect(rows[0].enabled).toBe(true);
    expect(rows[0].price).toBe(100);
  });
});

describe("loadFlooringCatalogAssemblyForEdit", () => {
  it("пустой состав → empty, без error", async () => {
    const fetchFn = vi.fn().mockResolvedValue(makeCatalogAssemblyDto({ rows: [] }));
    const result = await loadFlooringCatalogAssemblyForEdit("covering", 11, fetchFn);
    expect(result.status).toBe("empty");
    expect(result.rows).toEqual([]);
    expect(result.error).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledWith("covering", 11);
  });

  it("ошибка fetch → failed, плоское редактирование может продолжаться", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await loadFlooringCatalogAssemblyForEdit("covering", 11, fetchFn);
    expect(result.status).toBe("failed");
    expect(result.rows).toEqual([]);
    expect(result.error).toBe("network down");
    expect(FLOORING_ASSEMBLY_LOAD_FAILED_WARNING).toContain("состав не удалось загрузить");
  });

  it.each([
    ["covering", 42] as const,
    ["preparation", 7] as const,
    ["layout", 3] as const,
  ])("targetKind %s передаётся в fetch", async (targetKind, targetId) => {
    const fetchFn = vi.fn().mockResolvedValue(
      makeCatalogAssemblyDto({ target_kind: targetKind, target_id: targetId }),
    );
    const result = await loadFlooringCatalogAssemblyForEdit(targetKind, targetId, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(targetKind, targetId);
    expect(result.status).toBe("loaded");
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("loaded возвращает title и rows", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      makeCatalogAssemblyDto({
        title: "Ламинат состав",
        rows: [
          makeCatalogAssemblyRowDto({ title: "Материал", kind: "material", section: "covering" }),
        ],
      }),
    );
    const result = await loadFlooringCatalogAssemblyForEdit("covering", 1, fetchFn);
    expect(result.status).toBe("loaded");
    expect(result.title).toBe("Ламинат состав");
    expect((result.rows[0] as CoveringAssemblyRow).kind).toBe("material");
  });
});
