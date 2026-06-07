import { describe, expect, it } from "vitest";

import {
  formatCatalogDecimalDisplay,
  isCatalogDecimalCommitValid,
  normalizeCatalogDecimalOnBlur,
  parseCatalogDecimal,
  sanitizeCatalogDecimalInput,
} from "./catalog-decimal-input";

describe("sanitizeCatalogDecimalInput", () => {
  it("сохраняет промежуточные черновики 0, 0, 0,0 и 0,08", () => {
    expect(sanitizeCatalogDecimalInput("0")).toBe("0");
    expect(sanitizeCatalogDecimalInput("0,")).toBe("0,");
    expect(sanitizeCatalogDecimalInput("0,0")).toBe("0,0");
    expect(sanitizeCatalogDecimalInput("0,08")).toBe("0,08");
  });

  it("разрешает пустую строку и точку как разделитель", () => {
    expect(sanitizeCatalogDecimalInput("")).toBe("");
    expect(sanitizeCatalogDecimalInput("0.08")).toBe("0.08");
    expect(sanitizeCatalogDecimalInput(".")).toBe(".");
  });

  it("отбрасывает недопустимые символы", () => {
    expect(sanitizeCatalogDecimalInput("12abc")).toBe("12");
    expect(sanitizeCatalogDecimalInput("1a2,5b")).toBe("12,5");
  });
});

describe("parseCatalogDecimal / normalizeCatalogDecimalOnBlur", () => {
  it("парсит запятую в десятичное число", () => {
    expect(parseCatalogDecimal("0,08")).toBeCloseTo(0.08, 6);
    expect(parseCatalogDecimal("12,5")).toBeCloseTo(12.5, 6);
  });

  it("нормализует blur-строку в числовой текст", () => {
    expect(normalizeCatalogDecimalOnBlur("0,08")).toBe("0.08");
    expect(normalizeCatalogDecimalOnBlur("")).toBe("");
    expect(normalizeCatalogDecimalOnBlur("0,")).toBe("0");
  });
});

describe("formatCatalogDecimalDisplay", () => {
  it("показывает явный ноль как «0», а не пустую строку", () => {
    expect(formatCatalogDecimalDisplay(0)).toBe("0");
    expect(formatCatalogDecimalDisplay(null)).toBe("");
    expect(formatCatalogDecimalDisplay(undefined)).toBe("");
  });

  it("форматирует дробные значения без лишних нулей", () => {
    expect(formatCatalogDecimalDisplay(0.08)).toBe("0.08");
  });
});

describe("isCatalogDecimalCommitValid", () => {
  it("отклоняет мусор после sanitize", () => {
    expect(isCatalogDecimalCommitValid("abc")).toBe(false);
    expect(isCatalogDecimalCommitValid("0,08")).toBe(true);
    expect(isCatalogDecimalCommitValid("")).toBe(true);
  });
});
