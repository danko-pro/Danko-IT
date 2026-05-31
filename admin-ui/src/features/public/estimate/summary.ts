import { type AppliancesCalculationResult } from "../public-estimate-appliances";
import { type CeilingCalculationResult } from "../public-estimate-ceiling";
import { type CompletionCalculationResult } from "../public-estimate-completion";
import { type DoorCalculationResult, type DoorOptions } from "../public-estimate-doors";
import { type ElectricCalculationResult } from "../public-estimate-electric";
import { type FlooringCalculationResult } from "../public-estimate-flooring";
import { type EstimateGeometryTotals } from "../public-estimate-geometry";
import { type HomeGoodsCalculationResult } from "../public-estimate-home-goods";
import { looseFurnitureGroupLabels, type LooseFurnitureCalculationResult } from "../public-estimate-loose-furniture";
import { type EstimateTotals } from "../public-estimate-model";
import { type PlumbingCalculationResult } from "../public-estimate-plumbing";
import { type WarmFloorCalculationResult, type WarmFloorMode } from "../public-estimate-warm-floor";
import { type WallsCalculationResult } from "../public-estimate-walls";
import { formatMeasurement, formatMoney } from "./format";

export type EstimateSummaryItem = { label: string; value: string; isStrong?: boolean };

export type EstimateCompositionItem = { label: string; value: string };

export function buildVolumeSummaryItems(totals: EstimateGeometryTotals): EstimateSummaryItem[] {
  return [
    { label: "Площадь пола", value: formatMeasurement(totals.floorArea, "м²") },
    { label: "Периметр", value: formatMeasurement(totals.perimeter, "м") },
    { label: "Стены всего", value: formatMeasurement(totals.wallArea, "м²") },
    { label: "Проёмы", value: formatMeasurement(totals.openingArea, "м²") },
    { label: "Стены к отделке", value: formatMeasurement(totals.finishWallArea, "м²") },
    { label: "Потолки", value: formatMeasurement(totals.ceilingArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(totals.plinthLength, "м") },
  ];
}

export function buildCompactVolumeItems(summaryItems: EstimateSummaryItem[]): EstimateSummaryItem[] {
  return summaryItems.filter((item) =>
    ["Площадь пола", "Стены к отделке", "Потолки"].includes(item.label),
  );
}

export function buildEstimateTotalItems(estimateTotals: EstimateTotals): EstimateSummaryItem[] {
  return [
    { label: "Работы", value: formatMoney(estimateTotals.works) },
    { label: "Материалы", value: formatMoney(estimateTotals.materials) },
    { label: "Оборудование", value: formatMoney(estimateTotals.equipment) },
    { label: "Расходники", value: formatMoney(estimateTotals.consumables) },
    { label: "Итого", value: formatMoney(estimateTotals.total), isStrong: true },
    { label: "₽/м²", value: `${formatMoney(estimateTotals.pricePerSquareMeter)}/м²` },
  ];
}

export function buildWarmFloorSummaryItems(
  warmFloorMode: WarmFloorMode,
  warmFloorResult: WarmFloorCalculationResult,
): EstimateSummaryItem[] {
  return warmFloorMode === "water"
    ? [
        { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
        { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
        { label: "Труба", value: formatMeasurement(warmFloorResult.pipeMeters, "м") },
        { label: "Контуры", value: `${warmFloorResult.circuitCount} шт.` },
        { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
        { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
        { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
      ]
    : [
        { label: "Площадь", value: formatMeasurement(warmFloorResult.selectedArea, "м²") },
        { label: "Штроба", value: formatMeasurement(warmFloorResult.chaseLengthMeters, "м.п.") },
        { label: "Терморегулятор", value: `${warmFloorResult.thermostatCount} шт.` },
        { label: "Автомат в щит", value: `${warmFloorResult.electricBreakerCount} шт.` },
        { label: "Работы", value: formatMoney(warmFloorResult.worksTotal) },
        { label: "Материалы", value: formatMoney(warmFloorResult.materialsTotal) },
        { label: "Итого", value: formatMoney(warmFloorResult.total), isStrong: true },
      ];
}

export function buildFlooringSummaryItems(flooringResult: FlooringCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Площадь пола", value: formatMeasurement(flooringResult.flooringArea, "м²") },
    { label: "Площадь материалов", value: formatMeasurement(flooringResult.purchaseArea, "м²") },
    { label: "Плинтус", value: formatMeasurement(flooringResult.plinthLength, "м") },
    { label: "Работы", value: formatMoney(flooringResult.worksTotal) },
    { label: "Материалы", value: formatMoney(flooringResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(flooringResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(flooringResult.total), isStrong: true },
  ];
}

export function buildWallsSummaryItems(wallsResult: WallsCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Площадь стен", value: formatMeasurement(wallsResult.wallFinishArea, "м²") },
    { label: "Площадь материалов", value: formatMeasurement(wallsResult.purchaseArea, "м²") },
    { label: "Работы", value: formatMoney(wallsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(wallsResult.materialsTotal) },
    { label: "Расходники", value: formatMoney(wallsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(wallsResult.total), isStrong: true },
  ];
}

export function buildCeilingSummaryItems(ceilingResult: CeilingCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Площадь потолков", value: formatMeasurement(ceilingResult.ceilingArea, "м²") },
    { label: "Точки света", value: `${ceilingResult.pointCount} шт.` },
    { label: "Работы", value: formatMoney(ceilingResult.worksTotal) },
    { label: "Материалы", value: formatMoney(ceilingResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(ceilingResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(ceilingResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(ceilingResult.total), isStrong: true },
  ];
}

export function buildElectricSummaryItems(electricResult: ElectricCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Розетки", value: `${electricResult.socketCount} шт.` },
    { label: "Световые выводы", value: `${electricResult.lightOutputCount} шт.` },
    { label: "Выключатели", value: `${electricResult.switchCount} шт.` },
    { label: "Кухонные выводы", value: `${electricResult.kitchenOutputCount} шт.` },
    { label: "Щит / автоматика", value: `${electricResult.switchboardAutomationCount} поз.` },
    { label: "Работы", value: formatMoney(electricResult.worksTotal) },
    { label: "Материалы", value: formatMoney(electricResult.materialsTotal) },
    { label: "Оборудование", value: formatMoney(electricResult.equipmentTotal) },
    { label: "Расходники", value: formatMoney(electricResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(electricResult.total), isStrong: true },
  ];
}

export function buildPlumbingCompositionItems(plumbingResult: PlumbingCalculationResult): EstimateCompositionItem[] {
  return [
    { label: "Санузлов", value: `${plumbingResult.bathroomCount} шт.` },
    { label: "Кухня", value: plumbingResult.hasKitchen ? "да" : "нет" },
    { label: "ХВС", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
  ];
}

// A8.2: разбивка по категориям (Работы/Материалы/Оборудование/Расходники) удалена из публичного
// UI сантехники — зоны снапшота отдают единый запечённый итог без разложения себестоимости (whitelist).
export function buildPlumbingSummaryItems(plumbingResult: PlumbingCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "ХВС точки", value: `${plumbingResult.coldWaterPoints} точ.` },
    { label: "ГВС точки", value: `${plumbingResult.hotWaterPoints} точ.` },
    { label: "Канализация", value: `${plumbingResult.sewerPoints} точ.` },
    { label: "Приборы", value: `${plumbingResult.fixtureCount} шт.` },
    { label: "Итого", value: formatMoney(plumbingResult.total), isStrong: true },
  ];
}

export function buildDoorCompositionItems(
  doorsResult: DoorCalculationResult,
  doorOptions: DoorOptions,
): EstimateCompositionItem[] {
  return [
    { label: "Дверей", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Санузловых заверток", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Пакет", value: doorsResult.packageLabel },
    { label: "Монтаж", value: doorOptions.includeInstallation ? "да" : "нет" },
    { label: "Логистика", value: doorOptions.includeLogistics ? "да" : "нет" },
  ];
}

export function buildDoorSummaryItems(doorsResult: DoorCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Двери", value: `${doorsResult.totalDoorCount} шт.` },
    { label: "Ручки", value: `${doorsResult.handleCount} шт.` },
    { label: "Завертки", value: `${doorsResult.privacyLockCount} шт.` },
    { label: "Доставка / подъём", value: formatMoney(doorsResult.logisticsTotal) },
    { label: "Работы", value: formatMoney(doorsResult.worksTotal) },
    { label: "Материалы", value: formatMoney(doorsResult.materialsTotal) },
    { label: "Фурнитура", value: formatMoney(doorsResult.hardwareTotal) },
    { label: "Доп. расходы", value: formatMoney(doorsResult.consumablesTotal) },
    { label: "Итого", value: formatMoney(doorsResult.total), isStrong: true },
  ];
}

export function buildCompletionSummaryItems(completionResult: CompletionCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Кухня", value: formatMoney(completionResult.kitchenTotal) },
    { label: "Мебель", value: formatMoney(completionResult.furnitureTotal) },
    { label: "Компонентов включено", value: `${completionResult.includedComponentCount} шт.` },
    { label: "Итого", value: formatMoney(completionResult.total), isStrong: true },
  ];
}

export function buildAppliancesSummaryItems(appliancesResult: AppliancesCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Пакет", value: appliancesResult.packageLabel },
    { label: "Позиции включены", value: `${appliancesResult.includedItemCount} шт.` },
    { label: "Кухонная техника", value: formatMoney(appliancesResult.kitchenAppliancesTotal) },
    { label: "TV-зона", value: formatMoney(appliancesResult.tvTotal) },
    { label: "Стирка", value: formatMoney(appliancesResult.laundryTotal) },
    { label: "Итого", value: formatMoney(appliancesResult.total), isStrong: true },
  ];
}

export function buildLooseFurnitureSummaryItems(
  looseFurnitureResult: LooseFurnitureCalculationResult,
): EstimateSummaryItem[] {
  return [
    { label: "Пакет", value: looseFurnitureResult.packageLabel },
    { label: "Позиции включены", value: `${looseFurnitureResult.includedItemCount} шт.` },
    { label: looseFurnitureGroupLabels.dining, value: formatMoney(looseFurnitureResult.diningTotal) },
    { label: looseFurnitureGroupLabels.living, value: formatMoney(looseFurnitureResult.livingTotal) },
    { label: looseFurnitureGroupLabels.bedroom, value: formatMoney(looseFurnitureResult.bedroomTotal) },
    { label: looseFurnitureGroupLabels.loggia, value: formatMoney(looseFurnitureResult.loggiaTotal) },
    { label: looseFurnitureGroupLabels.work, value: formatMoney(looseFurnitureResult.workTotal) },
    { label: looseFurnitureGroupLabels.storage, value: formatMoney(looseFurnitureResult.storageTotal) },
    { label: looseFurnitureGroupLabels.hall, value: formatMoney(looseFurnitureResult.hallTotal) },
    { label: "Итого", value: formatMoney(looseFurnitureResult.total), isStrong: true },
  ];
}

export function buildHomeGoodsSummaryItems(homeGoodsResult: HomeGoodsCalculationResult): EstimateSummaryItem[] {
  return [
    { label: "Уборка", value: formatMoney(homeGoodsResult.cleaningTotal) },
    { label: "Товары для дома", value: formatMoney(homeGoodsResult.homeGoodsTotal) },
    { label: "Пакет", value: homeGoodsResult.packageLabel },
    { label: "Итого", value: formatMoney(homeGoodsResult.total), isStrong: true },
  ];
}
