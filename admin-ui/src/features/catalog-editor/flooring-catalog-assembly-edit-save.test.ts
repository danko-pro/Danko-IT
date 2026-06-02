import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../shared/utils";
import type { CoveringAssemblyRow } from "./flooring-assembly";
import {
  assemblyEditRowsAreEmpty,
  deleteFlooringCatalogAssemblyIgnoringNotFound,
  formatAssemblyEditPersistFeedback,
  FLOORING_ASSEMBLY_EDIT_SAVE_FAILED_WARNING,
  isAssemblyDeleteNotFoundError,
  persistFlooringCatalogAssemblyOnEdit,
} from "./flooring-catalog-assembly-edit-save";

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

describe("persistFlooringCatalogAssemblyOnEdit", () => {
  it("непустые строки → saveFlooringCatalogAssembly с targetKind/id/payload", async () => {
    const saveAssembly = vi.fn().mockResolvedValue({});
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "covering",
      targetId: 42,
      title: "Ламинат",
      rows: [makeAssemblyRow()],
      hadAssemblyOnLoad: false,
      saveAssembly,
    });
    expect(result).toEqual({ status: "saved" });
    expect(saveAssembly).toHaveBeenCalledWith(
      "covering",
      42,
      expect.objectContaining({ title: "Ламинат", rows: expect.any(Array) }),
    );
    expect(saveAssembly.mock.calls[0][2].rows).toHaveLength(1);
  });

  it("пустые строки + был состав → deleteFlooringCatalogAssembly", async () => {
    const deleteAssembly = vi.fn().mockResolvedValue({ deleted: true });
    const saveAssembly = vi.fn();
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "preparation",
      targetId: 7,
      title: "Стяжка",
      rows: [],
      hadAssemblyOnLoad: true,
      saveAssembly,
      deleteAssembly,
    });
    expect(result).toEqual({ status: "cleared" });
    expect(deleteAssembly).toHaveBeenCalledWith("preparation", 7);
    expect(saveAssembly).not.toHaveBeenCalled();
  });

  it("пустые строки + состав не был → no-op", async () => {
    const deleteAssembly = vi.fn();
    const saveAssembly = vi.fn();
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "layout",
      targetId: 3,
      title: "Диагональ",
      rows: [],
      hadAssemblyOnLoad: false,
      saveAssembly,
      deleteAssembly,
    });
    expect(result).toEqual({ status: "skipped" });
    expect(deleteAssembly).not.toHaveBeenCalled();
    expect(saveAssembly).not.toHaveBeenCalled();
  });

  it("ошибка save → failed, flat считается уже сохранённым снаружи", async () => {
    const saveAssembly = vi.fn().mockRejectedValue(new Error("PUT failed"));
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "covering",
      targetId: 10,
      title: "Тест",
      rows: [makeAssemblyRow()],
      hadAssemblyOnLoad: true,
      saveAssembly,
    });
    expect(result).toEqual({ status: "failed", message: "PUT failed" });
    const feedback = formatAssemblyEditPersistFeedback("covering", result);
    expect(feedback.warningMessage).toBe(FLOORING_ASSEMBLY_EDIT_SAVE_FAILED_WARNING);
    expect(feedback.statusMessage).toBeNull();
  });

  it("DELETE 404 не критичен → cleared", async () => {
    const deleteAssembly = vi.fn().mockRejectedValue(new ApiError("Not found", 404, null));
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "covering",
      targetId: 5,
      title: "Покрытие",
      rows: [],
      hadAssemblyOnLoad: true,
      deleteAssembly,
    });
    expect(result).toEqual({ status: "cleared" });
  });

  it("DELETE прочая ошибка → failed", async () => {
    const deleteAssembly = vi.fn().mockRejectedValue(new Error("server error"));
    const result = await persistFlooringCatalogAssemblyOnEdit({
      target: "covering",
      targetId: 5,
      title: "Покрытие",
      rows: [],
      hadAssemblyOnLoad: true,
      deleteAssembly,
    });
    expect(result).toEqual({ status: "failed", message: "server error" });
  });
});

describe("deleteFlooringCatalogAssemblyIgnoringNotFound", () => {
  it("пробрасывает не-404", async () => {
    const deleteAssembly = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(
      deleteFlooringCatalogAssemblyIgnoringNotFound("layout", 1, deleteAssembly),
    ).rejects.toThrow("boom");
  });

  it("глотает 404", async () => {
    const deleteAssembly = vi.fn().mockRejectedValue(new ApiError("missing", 404, null));
    await expect(
      deleteFlooringCatalogAssemblyIgnoringNotFound("layout", 1, deleteAssembly),
    ).resolves.toBeUndefined();
  });
});

describe("assemblyEditRowsAreEmpty / isAssemblyDeleteNotFoundError", () => {
  it("пустой массив строк", () => {
    expect(assemblyEditRowsAreEmpty([])).toBe(true);
    expect(assemblyEditRowsAreEmpty([makeAssemblyRow()])).toBe(false);
  });

  it("распознаёт ApiError 404", () => {
    expect(isAssemblyDeleteNotFoundError(new ApiError("x", 404, null))).toBe(true);
    expect(isAssemblyDeleteNotFoundError(new ApiError("x", 500, null))).toBe(false);
    expect(isAssemblyDeleteNotFoundError(new Error("x"))).toBe(false);
  });
});

describe("formatAssemblyEditPersistFeedback", () => {
  it("saved / cleared / skipped / failed", () => {
    expect(formatAssemblyEditPersistFeedback("covering", { status: "saved" }).statusMessage).toBe(
      "Покрытие сохранено, состав сохранён",
    );
    expect(formatAssemblyEditPersistFeedback("preparation", { status: "cleared" }).statusMessage).toBe(
      "Подготовка сохранена, состав очищен",
    );
    expect(formatAssemblyEditPersistFeedback("layout", { status: "skipped" })).toEqual({
      statusMessage: null,
      warningMessage: null,
    });
    expect(formatAssemblyEditPersistFeedback("layout", { status: "failed", message: "x" }).warningMessage).toBe(
      FLOORING_ASSEMBLY_EDIT_SAVE_FAILED_WARNING,
    );
  });
});
