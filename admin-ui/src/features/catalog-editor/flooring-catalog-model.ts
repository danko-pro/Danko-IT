import { normalizeNum } from "./api/flooring-mappers";
import type {
  FlooringAssemblyItemDraft,
  FlooringCoveringDraft,
  FlooringLayoutDraft,
  FlooringPreparationDraft,
  FlooringSnapshotDisplayRow,
  PublicFlooringSnapshotResponse,
} from "./api/flooring-types";
import type { CoveringAssemblyRow } from "./flooring-assembly";

export const SNAPSHOT_MISSING_WARNING =
  "Позиция создана в БД. В public snapshot она появится после backend mapping/F5c/F6.";

export const SNAPSHOT_MAPPING_DELAY_STATUS =
  "Изменение сохранено в БД. Public snapshot обновится после reload/build, если строка входит в public mapping.";

export function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("ru-RU")}%`;
}

export function consumablesSummaryPerM2(rates: Record<string, number>): string {
  const total =
    normalizeNum(rates.underlayPricePerM2) +
    normalizeNum(rates.adhesivePricePerM2) +
    normalizeNum(rates.primerPricePerM2) +
    normalizeNum(rates.svpPricePerM2) +
    normalizeNum(rates.groutPricePerM2) +
    normalizeNum(rates.toolConsumablesPerM2);
  return `${formatMoney(total)} ₽/м²`;
}

export function filterRows(
  rows: FlooringSnapshotDisplayRow[],
  section: FlooringSnapshotDisplayRow["section"],
): FlooringSnapshotDisplayRow[] {
  return rows.filter((row) => row.section === section);
}

export function emptyCoveringDraft(): FlooringCoveringDraft {
  return {
    id: 0,
    title: "",
    materialPricePerM2: 0,
    laborPricePerM2: 0,
    baseWastePercent: 0,
    underlayMode: "none",
    underlayConsumptionPerM2: 0,
    glueConsumptionPerM2: 0,
    glueUnit: "kg",
    gluePricePerUnit: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    svpConsumptionPerM2: 0,
    svpUnit: "pcs",
    svpPricePerUnit: 0,
    groutConsumptionPerM2: 0,
    groutUnit: "kg",
    groutPricePerUnit: 0,
    customConsumables: [],
    needsPlinth: true,
    instrumentPricePerM2: 0,
    note: "",
  };
}

export function emptyPreparationDraft(): FlooringPreparationDraft {
  return {
    id: 0,
    title: "",
    laborPricePerM2: 0,
    materialPricePerM2: 0,
    primerConsumptionPerM2: 0,
    primerUnit: "l",
    primerPricePerUnit: 0,
    note: "",
  };
}

export function emptyLayoutDraft(): FlooringLayoutDraft {
  return {
    id: 0,
    title: "",
    laborFactor: 1,
    additionalWastePercent: 0,
    note: "",
  };
}

export function emptyAssemblyItemDraft(): FlooringAssemblyItemDraft {
  return {
    id: 0,
    sourceCode: "",
    section: "consumable",
    title: "",
    kind: "consumable",
    formula: "unit_consumption",
    unit: "pcs",
    price: 0,
    consumptionPerM2: 0,
    packageSize: null,
    layerMm: null,
    note: "",
    sortOrder: 100,
  };
}

export function snapshotHasTitle(
  snapshot: PublicFlooringSnapshotResponse,
  section: "coverings" | "preparations" | "layouts",
  title: string,
): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  const list =
    section === "coverings"
      ? snapshot.coverings
      : section === "preparations"
        ? snapshot.preparations
        : snapshot.layouts;
  return list.some((item) => item.title.trim().toLowerCase() === normalized);
}

export function getAssemblyDefaultTitle(rows: CoveringAssemblyRow[]): string {
  const enabledRows = rows.filter((row) => row.enabled);
  return (
    enabledRows.find((row) => row.kind === "material")?.title.trim() ||
    enabledRows.find((row) => row.kind === "work")?.title.trim() ||
    enabledRows[0]?.title.trim() ||
    ""
  );
}

export function snapshotRatesMatchRow(
  section: "coverings" | "preparations" | "layouts",
  title: string,
  before: PublicFlooringSnapshotResponse,
  after: PublicFlooringSnapshotResponse,
): boolean {
  const normalized = title.trim().toLowerCase();
  const list =
    section === "coverings"
      ? { before: before.coverings, after: after.coverings }
      : section === "preparations"
        ? { before: before.preparations, after: after.preparations }
        : { before: before.layouts, after: after.layouts };
  const prev = list.before.find((item) => item.title.trim().toLowerCase() === normalized);
  const next = list.after.find((item) => item.title.trim().toLowerCase() === normalized);
  if (!prev || !next) return false;
  return JSON.stringify(prev) === JSON.stringify(next);
}
