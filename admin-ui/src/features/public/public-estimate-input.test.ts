import { describe, expect, it } from "vitest";
import {
  ESTIMATE_CEILING_HEIGHT_MAX,
  ESTIMATE_CEILING_HEIGHT_MIN,
  normalizeEstimateCeilingHeightOnBlur,
  normalizeEstimateCountOnBlur,
  normalizeEstimateDecimalOnBlur,
  normalizeEstimateQuantityOnBlur,
  sanitizeEstimateDecimalInput,
  sanitizeEstimateIntegerInput,
} from "./public-estimate-input";

describe("sanitizeEstimateDecimalInput", () => {
  it("отбрасывает буквы и оставляет цифры", () => {
    expect(sanitizeEstimateDecimalInput("12abc")).toBe("12");
    expect(sanitizeEstimateDecimalInput("1a2b3")).toBe("123");
  });

  it("сохраняет один разделитель (запятую или точку) как ввёл пользователь", () => {
    expect(sanitizeEstimateDecimalInput("12,5")).toBe("12,5");
    expect(sanitizeEstimateDecimalInput("12.5")).toBe("12.5");
  });

  it("схлопывает несколько разделителей в один", () => {
    expect(sanitizeEstimateDecimalInput("12,5,3")).toBe("12,53");
    expect(sanitizeEstimateDecimalInput("1.2.3")).toBe("1.23");
  });

  it("разрешает пустое промежуточное состояние", () => {
    expect(sanitizeEstimateDecimalInput("")).toBe("");
    expect(sanitizeEstimateDecimalInput(",")).toBe(",");
  });
});

describe("sanitizeEstimateIntegerInput", () => {
  it("оставляет только цифры", () => {
    expect(sanitizeEstimateIntegerInput("12,5")).toBe("125");
    expect(sanitizeEstimateIntegerInput("3 шт")).toBe("3");
    expect(sanitizeEstimateIntegerInput("-4")).toBe("4");
    expect(sanitizeEstimateIntegerInput("")).toBe("");
  });
});

describe("normalizeEstimateDecimalOnBlur", () => {
  it("нормализует запятую в точку и убирает мусор", () => {
    expect(normalizeEstimateDecimalOnBlur("12,5")).toBe("12.5");
  });

  it("оставляет пустую строку пустой", () => {
    expect(normalizeEstimateDecimalOnBlur("")).toBe("");
    expect(normalizeEstimateDecimalOnBlur(",")).toBe("");
  });
});

describe("normalizeEstimateCountOnBlur", () => {
  it("приводит к целому >= 0, пустое к 0", () => {
    expect(normalizeEstimateCountOnBlur("")).toBe("0");
    expect(normalizeEstimateCountOnBlur("3")).toBe("3");
  });
});

describe("normalizeEstimateQuantityOnBlur", () => {
  it("гарантирует минимум 1 при пустом или нулевом значении", () => {
    expect(normalizeEstimateQuantityOnBlur("")).toBe("1");
    expect(normalizeEstimateQuantityOnBlur("0")).toBe("1");
    expect(normalizeEstimateQuantityOnBlur("4")).toBe("4");
  });
});

describe("normalizeEstimateCeilingHeightOnBlur", () => {
  it("клампит высоту в разумный диапазон", () => {
    expect(Number(normalizeEstimateCeilingHeightOnBlur("1.2"))).toBe(ESTIMATE_CEILING_HEIGHT_MIN);
    expect(Number(normalizeEstimateCeilingHeightOnBlur("9"))).toBe(ESTIMATE_CEILING_HEIGHT_MAX);
    expect(normalizeEstimateCeilingHeightOnBlur("2,75")).toBe("2.75");
  });

  it("подставляет дефолт для пустого значения", () => {
    expect(normalizeEstimateCeilingHeightOnBlur("")).toBe("2.7");
  });
});
