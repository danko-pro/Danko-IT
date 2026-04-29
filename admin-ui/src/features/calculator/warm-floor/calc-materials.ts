import type { CalculatorWarmFloorConfig, WarmFloorMaterialItem } from "./";

export const DEFAULT_PIPE_TITLE = "Труба PEX-a 16x2 для водяного тёплого пола";

export function normalizeWarmFloorConfig(config: CalculatorWarmFloorConfig): CalculatorWarmFloorConfig {
  const rawConfig = config as CalculatorWarmFloorConfig & {
    manifold_material_items_json?: string;
    pump_material_items_json?: string;
    consumable_material_items_json?: string;
  };
  const manifoldFallback = defaultManifoldMaterialItems(config.manifold_material_price);
  const pumpFallback = defaultPumpMaterialItems(config.pump_material_price);
  const consumableFallback = defaultConsumableMaterialItems();
  return {
    ...config,
    pipe_material_title: config.pipe_material_title || DEFAULT_PIPE_TITLE,
    manifold_material_items: normalizeMaterialItems(
      config.manifold_material_items ?? parseMaterialItemsJson(rawConfig.manifold_material_items_json),
      manifoldFallback,
    ),
    pump_material_items: normalizeMaterialItems(
      config.pump_material_items ?? parseMaterialItemsJson(rawConfig.pump_material_items_json),
      pumpFallback,
    ),
    consumable_material_items: normalizeMaterialItems(
      config.consumable_material_items ?? parseMaterialItemsJson(rawConfig.consumable_material_items_json),
      consumableFallback,
    ),
  };
}

export function normalizeMaterialItems(
  items: WarmFloorMaterialItem[] | undefined,
  fallback: WarmFloorMaterialItem[],
): WarmFloorMaterialItem[] {
  const normalized = (items ?? [])
    .map((item) => ({
      title: item.title.trim(),
      unit: item.unit.trim() || "компл.",
      quantity: Math.max(0, Number(item.quantity) || 0),
      amount: Math.max(0, Number(item.amount) || 0),
    }))
    .filter((item) => item.title);
  return normalized.length ? normalized : fallback;
}

export function materialItemsTotal(items: WarmFloorMaterialItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function parseMaterialItemsJson(rawValue: string | undefined): WarmFloorMaterialItem[] | undefined {
  if (!rawValue) return undefined;
  try {
    return JSON.parse(rawValue) as WarmFloorMaterialItem[];
  } catch {
    return undefined;
  }
}

function defaultManifoldMaterialItems(total: number): WarmFloorMaterialItem[] {
  return [
    { title: "Коллекторная группа с расходомерами", unit: "компл.", quantity: 1, amount: Math.round(total * 0.6) },
    { title: "Шкаф, крепёж и фитинги коллектора", unit: "компл.", quantity: 1, amount: Math.round(total * 0.4) },
  ];
}

function defaultPumpMaterialItems(total: number): WarmFloorMaterialItem[] {
  return [
    { title: "Насосно-смесительный узел", unit: "компл.", quantity: 1, amount: Math.round(total * 0.7) },
    { title: "Запорная арматура и фитинги насосного узла", unit: "компл.", quantity: 1, amount: Math.round(total * 0.3) },
  ];
}

function defaultConsumableMaterialItems(): WarmFloorMaterialItem[] {
  return [
    { title: "Крепёж трубы тёплого пола", unit: "компл.", quantity: 1, amount: 2500 },
    { title: "Демпферная лента и расходные фитинги", unit: "компл.", quantity: 1, amount: 3500 },
  ];
}
