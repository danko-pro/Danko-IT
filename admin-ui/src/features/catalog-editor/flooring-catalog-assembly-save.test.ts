import { describe, expect, it, vi } from "vitest";

import type { CoveringAssemblyRow } from "./flooring-assembly";
import {
  assemblySaveFailedWarning,
  buildFlooringCatalogAssemblyPayload,
  flooringAssemblyTargetToCatalogTarget,
  persistFlooringCatalogAssembly,
} from "./flooring-catalog-assembly-save";

function makeAssemblyRow(overrides: Partial<CoveringAssemblyRow> = {}): CoveringAssemblyRow {
  return {
    id: "row-1",
    title: "Работа",
    kind: "work",
    formula: "flat_per_m2",
    unit: "m2",
    price: 100,
    consumptionPerM2: 1,
    enabled: true,
    ...overrides,
  };
}

describe("buildFlooringCatalogAssemblyPayload", () => {
  it("covering: payload с targetKind covering и id созданной строки", () => {
    const payload = buildFlooringCatalogAssemblyPayload("covering", 42, "Ламинат", [makeAssemblyRow()]);
    expect(payload.title).toBe("Ламинат");
    expect(payload.version).toBe("flooring-assembly-v1");
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].is_enabled).toBe(true);
    expect(flooringAssemblyTargetToCatalogTarget("covering")).toBe("covering");
  });

  it("preparation: targetKind preparation", () => {
    const payload = buildFlooringCatalogAssemblyPayload("preparation", 7, "Стяжка", [
      makeAssemblyRow({ kind: "work", title: "Стяжка работа" }),
    ]);
    expect(payload.title).toBe("Стяжка");
    expect(flooringAssemblyTargetToCatalogTarget("preparation")).toBe("preparation");
  });

  it("layout: targetKind layout", () => {
    const payload = buildFlooringCatalogAssemblyPayload("layout", 3, "Диагональ", [
      makeAssemblyRow({ kind: "work", title: "Укладка" }),
    ]);
    expect(payload.title).toBe("Диагональ");
    expect(flooringAssemblyTargetToCatalogTarget("layout")).toBe("layout");
  });

  it("disabled row сохраняется с is_enabled=false", () => {
    const payload = buildFlooringCatalogAssemblyPayload("covering", 1, "Тест", [
      makeAssemblyRow({ enabled: false }),
      makeAssemblyRow({ id: "row-2", enabled: true }),
    ]);
    expect(payload.rows[0].is_enabled).toBe(false);
    expect(payload.rows[1].is_enabled).toBe(true);
    expect(payload.rows).toHaveLength(2);
  });
});

describe("persistFlooringCatalogAssembly", () => {
  it.each([
    ["covering", 42, "covering"] as const,
    ["preparation", 7, "preparation"] as const,
    ["layout", 3, "layout"] as const,
  ])("%s: save с targetKind и id", async (target, targetId, expectedKind) => {
    const saveAssembly = vi.fn().mockResolvedValue({});
    await persistFlooringCatalogAssembly({
      target,
      targetId,
      title: "Строка",
      assemblyRows: [makeAssemblyRow()],
      saveAssembly,
    });
    expect(saveAssembly).toHaveBeenCalledWith(expectedKind, targetId, expect.objectContaining({ title: "Строка" }));
  });

  it("ошибка save возвращает assembly_save_failed без throw", async () => {
    const saveAssembly = vi.fn().mockRejectedValue(new Error("PUT failed"));
    const result = await persistFlooringCatalogAssembly({
      target: "covering",
      targetId: 10,
      title: "Ламинат",
      assemblyRows: [makeAssemblyRow()],
      saveAssembly,
    });
    expect(result).toEqual({ status: "assembly_save_failed", message: "PUT failed" });
    expect(saveAssembly).toHaveBeenCalledWith(
      "covering",
      10,
      expect.objectContaining({ title: "Ламинат" }),
    );
  });

  it("успешный save возвращает success", async () => {
    const saveAssembly = vi.fn().mockResolvedValue({});
    const result = await persistFlooringCatalogAssembly({
      target: "preparation",
      targetId: 5,
      title: "Подготовка",
      assemblyRows: [makeAssemblyRow()],
      saveAssembly,
    });
    expect(result).toEqual({ status: "success" });
    expect(saveAssembly).toHaveBeenCalledWith("preparation", 5, expect.any(Object));
  });
});

describe("assemblySaveFailedWarning", () => {
  it("формирует предупреждение для покрытия", () => {
    expect(assemblySaveFailedWarning("covering", "timeout")).toContain("Покрытие создано");
    expect(assemblySaveFailedWarning("covering", "timeout")).toContain("timeout");
  });
});
