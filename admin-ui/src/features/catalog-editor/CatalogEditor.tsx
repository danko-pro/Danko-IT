import { useMemo, useRef, useState } from "react";
import {
  CATALOG_CATEGORIES,
  CATALOG_GROUPS,
  CATALOG_SOURCES,
  CATALOG_UNITS,
  DEFAULT_ZONE_RISK_PERCENT,
  PIPE_CLAMP_PER_METER,
  SINK_ZONE_GROOVE_METERS,
  WATER_POINT_FITTINGS_QTY,
  ZONE_SUBGROUPS,
  ZONE_SUBGROUP_LABELS,
  type CatalogCategory,
  type CatalogGroup,
  type CatalogItem,
  type CatalogSource,
  type CatalogUnit,
  type CatalogZone,
  type ZoneCompositionRow,
  type ZonePriceClassVariant,
  type ZoneSubgroup,
} from "./plumbing-seed";
import { usePlumbingCatalog } from "./api/client";
import { useWarmFloorCatalog } from "./api/warm-floor-client";
import type { PlumbingSnapshotPreview } from "./api/types";
import { CATALOG_EDITOR_STYLES } from "./styles";
import { WarmFloorCatalogPanel } from "./WarmFloorCatalogPanel";

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  works: "Работа",
  materials: "Материал",
  equipment: "Оборудование",
  consumables: "Расходники",
};

type SectionTab = {
  id: string;
  label: string;
  ready: boolean;
};

const SECTION_TABS: SectionTab[] = [
  { id: "plumbing", label: "Сантехника", ready: true },
  { id: "floors", label: "Полы", ready: false },
  { id: "walls", label: "Стены", ready: false },
  { id: "ceilings", label: "Потолки", ready: false },
  { id: "electrics", label: "Электрика", ready: false },
  { id: "warm-floor", label: "Тёплый пол", ready: true },
  { id: "doors", label: "Двери", ready: false },
  { id: "completion", label: "Комплектация", ready: false },
  { id: "appliances", label: "Техника", ready: false },
  { id: "furniture", label: "Мебель", ready: false },
  { id: "cleaning", label: "Уборка", ready: false },
];

const SINK_ZONE_GROOVE_ITEM_ID = "work-groove-pipe";

function zoneRiskPercent(zone: CatalogZone): number {
  return zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT;
}

function activePriceClassVariant(zone: CatalogZone): ZonePriceClassVariant | undefined {
  if (!zone.priceClassVariants?.length) return undefined;
  const activeId = zone.activePriceClassId ?? zone.priceClassVariants[0].id;
  return zone.priceClassVariants.find((variant) => variant.id === activeId) ?? zone.priceClassVariants[0];
}

function zoneCompositionRows(zone: CatalogZone): ZoneCompositionRow[] {
  const variant = activePriceClassVariant(zone);
  return variant ? [...zone.items, ...variant.items] : zone.items;
}

function isCatalogItem(value: unknown): value is CatalogItem {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.publicTitle === "string" &&
    typeof candidate.works === "number" &&
    typeof candidate.materials === "number" &&
    typeof candidate.equipment === "number" &&
    typeof candidate.consumables === "number"
  );
}

function normalizeItem(raw: CatalogItem): CatalogItem {
  return {
    id: raw.id,
    publicTitle: raw.publicTitle ?? "",
    technicalTitle: raw.technicalTitle ?? "",
    category: CATALOG_CATEGORIES.includes(raw.category) ? raw.category : "materials",
    unit: CATALOG_UNITS.includes(raw.unit) ? raw.unit : "шт",
    works: Number.isFinite(raw.works) ? raw.works : 0,
    materials: Number.isFinite(raw.materials) ? raw.materials : 0,
    equipment: Number.isFinite(raw.equipment) ? raw.equipment : 0,
    consumables: Number.isFinite(raw.consumables) ? raw.consumables : 0,
    coefficient: Number.isFinite(raw.coefficient) && raw.coefficient > 0 ? raw.coefficient : 1,
    group: CATALOG_GROUPS.includes(raw.group) ? raw.group : "Доп.",
    source: CATALOG_SOURCES.includes(raw.source) ? raw.source : "вручную",
  };
}

function isCatalogZone(value: unknown): value is CatalogZone {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.title === "string" && Array.isArray(candidate.items);
}

function normalizePriceClassVariants(raw: unknown): ZonePriceClassVariant[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const variants = raw
    .filter((entry) => entry && typeof entry === "object" && typeof (entry as { id?: unknown }).id === "string")
    .map((entry) => {
      const variant = entry as ZonePriceClassVariant;
      const items = Array.isArray(variant.items)
        ? variant.items
            .filter((row) => row && typeof row.atomicItemId === "string")
            .map((row) => ({
              atomicItemId: row.atomicItemId,
              quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1,
              coefficient:
                row.coefficient != null && Number.isFinite(row.coefficient) && row.coefficient > 0
                  ? row.coefficient
                  : undefined,
            }))
        : [];
      return {
        id: variant.id,
        label: typeof variant.label === "string" ? variant.label : variant.id,
        items,
      };
    });
  return variants.length > 0 ? variants : undefined;
}

function normalizeZone(raw: CatalogZone): CatalogZone {
  const subgroup = ZONE_SUBGROUPS.includes(raw.subgroup) ? raw.subgroup : "Доп.";
  const items = Array.isArray(raw.items)
    ? raw.items
        .filter((row) => row && typeof row.atomicItemId === "string")
        .map((row) => ({
          atomicItemId: row.atomicItemId,
          quantity: Number.isFinite(row.quantity) && row.quantity > 0 ? row.quantity : 1,
          coefficient:
            row.coefficient != null && Number.isFinite(row.coefficient) && row.coefficient > 0
              ? row.coefficient
              : undefined,
        }))
    : [];
  const priceClassVariants = normalizePriceClassVariants(raw.priceClassVariants);
  const riskPercent =
    raw.riskPercent != null && Number.isFinite(raw.riskPercent) && raw.riskPercent >= 0
      ? raw.riskPercent
      : undefined;
  return {
    id: raw.id,
    subgroup,
    title: raw.title ?? "Новая зона",
    description: typeof raw.description === "string" ? raw.description : undefined,
    items,
    riskPercent,
    priceClassVariants,
    activePriceClassId:
      typeof raw.activePriceClassId === "string" &&
      priceClassVariants?.some((variant) => variant.id === raw.activePriceClassId)
        ? raw.activePriceClassId
        : priceClassVariants?.[0]?.id,
  };
}

function baseSum(item: CatalogItem): number {
  return item.works + item.materials + item.equipment + item.consumables;
}

function itemUnitPrice(item: CatalogItem): number {
  return Math.round(baseSum(item) * item.coefficient);
}

function formatMoney(value: number): string {
  return value.toLocaleString("ru-RU");
}

function compositionQtyHint(atomicItemId: string, quantity: number, unit?: CatalogUnit): string | null {
  const twoPointFittingsQty = WATER_POINT_FITTINGS_QTY * 2;

  if (atomicItemId === "pipe-sewer-50" && quantity === 3.5) {
    return "3,5 м — ориентир на канализацию к мойке";
  }
  if (atomicItemId === "pipe-ppr-d20" && quantity === 20) {
    return "20 м = 10 м × 2 точки (ХВС+ГВС)";
  }
  if (atomicItemId === "pipe-ppr-d20" && unit === "м.п." && quantity > 1) {
    return `${quantity} м — правило: 10 м на водяную точку`;
  }
  if (atomicItemId === "ppr-d20-outlet" && quantity === twoPointFittingsQty) {
    return `12 = ${WATER_POINT_FITTINGS_QTY}×2 точки (ХВС+ГВС)`;
  }
  if (atomicItemId === "ppr-d20-fitting" && quantity === twoPointFittingsQty) {
    return `12 = ${WATER_POINT_FITTINGS_QTY}×2 точки (ХВС+ГВС)`;
  }
  if (
    (atomicItemId === "ppr-d20-outlet" || atomicItemId === "ppr-d20-fitting") &&
    unit === "шт" &&
    quantity > 1
  ) {
    return `${quantity} шт — правило: ${WATER_POINT_FITTINGS_QTY} на водяную точку`;
  }
  if (atomicItemId === "pipe-clamp-ppr-d20" && quantity === 20 * PIPE_CLAMP_PER_METER) {
    return `30 = 20 м × ${PIPE_CLAMP_PER_METER}`;
  }
  if (atomicItemId === "pipe-clamp-sewer" && quantity === 3.5 * PIPE_CLAMP_PER_METER) {
    return `5,25 = 3,5 м × ${PIPE_CLAMP_PER_METER}`;
  }
  if (atomicItemId === SINK_ZONE_GROOVE_ITEM_ID && quantity === SINK_ZONE_GROOVE_METERS) {
    return `${SINK_ZONE_GROOVE_METERS} м — ориентир для зоны мойки без проекта`;
  }
  if (atomicItemId === SINK_ZONE_GROOVE_ITEM_ID && unit === "м.п." && quantity > 0) {
    return `${quantity} м — ориентир штробления без проекта (не 1:1 с трубами)`;
  }
  if (
    (atomicItemId === "pipe-clamp-ppr-d20" || atomicItemId === "pipe-clamp-sewer") &&
    unit === "шт" &&
    quantity > 0
  ) {
    return `${quantity} шт — правило: ${PIPE_CLAMP_PER_METER} на м.п. трубы`;
  }
  return null;
}

function makeNewItemId(existing: CatalogItem[]): string {
  const ids = new Set(existing.map((item) => item.id));
  let counter = existing.length + 1;
  let candidate = `new-item-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `new-item-${counter}`;
  }
  return candidate;
}

function makeNewZoneId(existing: CatalogZone[]): string {
  const ids = new Set(existing.map((zone) => zone.id));
  let counter = existing.length + 1;
  let candidate = `zone-${counter}`;
  while (ids.has(candidate)) {
    counter += 1;
    candidate = `zone-${counter}`;
  }
  return candidate;
}

export function CatalogEditor() {
  const catalog = usePlumbingCatalog();
  const warmFloorCatalog = useWarmFloorCatalog();
  const { items, zones, setItems, setZones, loading, saving, error, savedAt } = catalog;
  const [activeTab, setActiveTab] = useState<string>("plumbing");
  const [plumbingView, setPlumbingView] = useState<"zones" | "library">("zones");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | CatalogGroup>("all");
  const [collapsedSubgroups, setCollapsedSubgroups] = useState<Set<string>>(new Set());
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const itemsById = useMemo(() => {
    const map = new Map<string, CatalogItem>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (groupFilter !== "all" && item.group !== groupFilter) return false;
      if (!query) return true;
      return (
        item.publicTitle.toLowerCase().includes(query) ||
        item.technicalTitle.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [items, search, groupFilter]);

  const libraryTotals = useMemo(() => {
    const base = filteredItems.reduce((sum, item) => sum + baseSum(item), 0);
    const withCoef = filteredItems.reduce((sum, item) => sum + itemUnitPrice(item), 0);
    return { base, withCoef };
  }, [filteredItems]);

  function zoneRowTotal(row: { atomicItemId: string; quantity: number; coefficient?: number }): number {
    const item = itemsById.get(row.atomicItemId);
    if (!item) return 0;
    return Math.round(itemUnitPrice(item) * row.quantity * (row.coefficient ?? 1));
  }

  function zoneSubtotal(zone: CatalogZone): number {
    return zoneCompositionRows(zone).reduce((sum, row) => sum + zoneRowTotal(row), 0);
  }

  function zoneRiskAmount(zone: CatalogZone): number {
    return Math.round((zoneSubtotal(zone) * zoneRiskPercent(zone)) / 100);
  }

  function zoneGrandTotal(zone: CatalogZone): number {
    return zoneSubtotal(zone) + zoneRiskAmount(zone);
  }

  const sectionTotal = useMemo(
    () => zones.reduce((sum, zone) => sum + zoneGrandTotal(zone), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones, itemsById],
  );

  // --- Мутации библиотеки ---
  function updateItem(id: string, patch: Partial<CatalogItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateItemNumber(id: string, field: keyof CatalogItem, value: string) {
    const parsed = value === "" ? 0 : Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    updateItem(id, { [field]: parsed } as Partial<CatalogItem>);
  }

  function addLibraryItem() {
    setItems((prev) => {
      const newItem: CatalogItem = {
        id: makeNewItemId(prev),
        publicTitle: "Новая позиция",
        technicalTitle: "",
        category: "materials",
        unit: "шт",
        works: 0,
        materials: 0,
        equipment: 0,
        consumables: 0,
        coefficient: 1,
        group: groupFilter === "all" ? "Доп." : groupFilter,
        source: "вручную",
      };
      return [newItem, ...prev];
    });
  }

  function removeLibraryItem(id: string) {
    const usedIn = zones.filter((zone) => zone.items.some((row) => row.atomicItemId === id));
    if (usedIn.length > 0) {
      const ok = window.confirm(
        `Позиция используется в зонах: ${usedIn.map((z) => z.title).join(", ")}. Удалить из библиотеки и из состава этих зон?`,
      );
      if (!ok) return;
      setZones((prev) =>
        prev.map((zone) => ({ ...zone, items: zone.items.filter((row) => row.atomicItemId !== id) })),
      );
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  // --- Мутации зон ---
  function addZone(subgroup: ZoneSubgroup) {
    setZones((prev) => {
      const zone: CatalogZone = {
        id: makeNewZoneId(prev),
        subgroup,
        title: "Новая зона",
        description: "",
        items: [],
        riskPercent: DEFAULT_ZONE_RISK_PERCENT,
      };
      return [...prev, zone];
    });
  }

  function updateZone(id: string, patch: Partial<CatalogZone>) {
    setZones((prev) => prev.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)));
  }

  function removeZone(id: string, title: string) {
    if (!window.confirm(`Удалить зону «${title}»?`)) return;
    setZones((prev) => prev.filter((zone) => zone.id !== id));
  }

  function addZoneRow(zoneId: string, atomicItemId: string) {
    if (!atomicItemId) return;
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        if (zone.items.some((row) => row.atomicItemId === atomicItemId)) {
          return {
            ...zone,
            items: zone.items.map((row) =>
              row.atomicItemId === atomicItemId ? { ...row, quantity: row.quantity + 1 } : row,
            ),
          };
        }
        return { ...zone, items: [...zone.items, { atomicItemId, quantity: 1 }] };
      }),
    );
  }

  function updateZoneRow(
    zoneId: string,
    atomicItemId: string,
    field: "quantity" | "coefficient",
    value: string,
    scope: "base" | "variant" = "base",
  ) {
    const parsed = value === "" ? (field === "coefficient" ? undefined : 0) : Number(value.replace(",", "."));
    if (parsed !== undefined && !Number.isFinite(parsed)) return;
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId) return zone;
        if (scope === "variant" && zone.priceClassVariants?.length) {
          const activeId = zone.activePriceClassId ?? zone.priceClassVariants[0].id;
          return {
            ...zone,
            priceClassVariants: zone.priceClassVariants.map((variant) =>
              variant.id !== activeId
                ? variant
                : {
                    ...variant,
                    items: variant.items.map((row) =>
                      row.atomicItemId === atomicItemId ? { ...row, [field]: parsed } : row,
                    ),
                  },
            ),
          };
        }
        return {
          ...zone,
          items: zone.items.map((row) =>
            row.atomicItemId === atomicItemId ? { ...row, [field]: parsed } : row,
          ),
        };
      }),
    );
  }

  function updateZoneRiskPercent(zoneId: string, value: string) {
    const parsed = value === "" ? DEFAULT_ZONE_RISK_PERCENT : Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return;
    updateZone(zoneId, { riskPercent: parsed });
  }

  function removeZoneRow(zoneId: string, atomicItemId: string) {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id !== zoneId
          ? zone
          : { ...zone, items: zone.items.filter((row) => row.atomicItemId !== atomicItemId) },
      ),
    );
  }

  function replaceZoneVariantRow(zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) {
    if (!newAtomicItemId || oldAtomicItemId === newAtomicItemId) return;
    setZones((prev) =>
      prev.map((zone) => {
        if (zone.id !== zoneId || !zone.priceClassVariants?.length) return zone;
        const activeId = zone.activePriceClassId ?? zone.priceClassVariants[0].id;
        return {
          ...zone,
          priceClassVariants: zone.priceClassVariants.map((variant) =>
            variant.id !== activeId
              ? variant
              : {
                  ...variant,
                  items: variant.items.map((row) =>
                    row.atomicItemId === oldAtomicItemId ? { ...row, atomicItemId: newAtomicItemId } : row,
                  ),
                },
          ),
        };
      }),
    );
  }

  function toggleSubgroup(subgroup: string) {
    setCollapsedSubgroups((prev) => {
      const next = new Set(prev);
      if (next.has(subgroup)) next.delete(subgroup);
      else next.add(subgroup);
      return next;
    });
  }

  function toggleZone(zoneId: string) {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  }

  // --- Обновление из БД / экспорт / импорт (библиотека + зоны единым объектом) ---
  function reloadFromDb() {
    if (!window.confirm("Перечитать каталог из базы данных? Несохранённые правки будут отброшены.")) return;
    void catalog.reload();
  }

  function togglePreview() {
    const next = !showPreview;
    setShowPreview(next);
    if (next) {
      void catalog.loadPreview();
    }
  }

  function exportJson() {
    const bundle = { version: 2, library: items, zones };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `danko-catalog-plumbing-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function importJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Новый формат: { library, zones }. Старый формат: массив позиций.
        const rawLibrary = Array.isArray(parsed) ? parsed : parsed?.library;
        const rawZones = Array.isArray(parsed) ? [] : parsed?.zones;
        if (!Array.isArray(rawLibrary)) {
          window.alert("Неверный формат файла: нет библиотеки позиций.");
          return;
        }
        const importedItems = rawLibrary.filter(isCatalogItem).map(normalizeItem);
        if (importedItems.length === 0) {
          window.alert("В файле не найдено корректных позиций.");
          return;
        }
        setItems(importedItems);
        if (Array.isArray(rawZones)) {
          setZones(rawZones.filter(isCatalogZone).map(normalizeZone));
        }
      } catch {
        window.alert("Не удалось разобрать JSON-файл.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  const activeSection = SECTION_TABS.find((tab) => tab.id === activeTab);
  const activeLoading = activeTab === "warm-floor" ? warmFloorCatalog.loading : loading;
  const activeSaving = activeTab === "warm-floor" ? warmFloorCatalog.saving : saving;
  const activeSavedAt = activeTab === "warm-floor" ? warmFloorCatalog.savedAt : savedAt;
  const activeError = activeTab === "warm-floor" ? warmFloorCatalog.error : error;

  return (
    <div className="catalog-editor">
      <style>{CATALOG_EDITOR_STYLES}</style>

      <header className="ce-header">
        <div className="ce-header-text">
          <span className="ce-kicker">Danko BuildTech · внутренний инструмент</span>
          <h1>Редактор каталога расценок</h1>
          <p>
            Каталог сантехники хранится в базе данных и редактируется через REST API
            (<code>/api/calculator/plumbing/*</code>) за авторизацией. Изменения сохраняются
            автоматически по сети.
          </p>
        </div>
        <div className="ce-save-status">
          <span className="ce-dot" aria-hidden="true" />
          {activeLoading
            ? "Загрузка из БД…"
            : activeSaving
              ? "Сохранение…"
              : `Сохранено в БД${activeSavedAt ? ` · ${activeSavedAt}` : ""}`}
        </div>
      </header>

      {activeError ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {activeError}
        </div>
      ) : null}

      <nav className="ce-tabs" aria-label="Разделы каталога">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ce-tab${tab.id === activeTab ? " is-active" : ""}${tab.ready ? "" : " is-stub"}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {!tab.ready && <span className="ce-tab-badge">в разработке</span>}
          </button>
        ))}
      </nav>

      {activeSection?.id === "warm-floor" ? (
        <WarmFloorCatalogPanel controller={warmFloorCatalog} />
      ) : activeSection && !activeSection.ready ? (
        <div className="ce-stub-panel">
          <h2>{activeSection.label}</h2>
          <p>Раздел в разработке. Сейчас наполняется только вкладка «Сантехника».</p>
        </div>
      ) : (
        <>
          <div className="ce-toolbar">
            <div className="ce-subtabs">
              <button
                type="button"
                className={`ce-subtab${plumbingView === "zones" ? " is-active" : ""}`}
                onClick={() => setPlumbingView("zones")}
              >
                Зоны
              </button>
              <button
                type="button"
                className={`ce-subtab${plumbingView === "library" ? " is-active" : ""}`}
                onClick={() => setPlumbingView("library")}
              >
                Библиотека позиций (Сан v1)
              </button>
            </div>
            <div className="ce-toolbar-group">
              <button
                type="button"
                className={`ce-btn${showPreview ? " ce-btn-primary" : ""}`}
                onClick={togglePreview}
              >
                Превью публичной цены
              </button>
              <button type="button" className="ce-btn" onClick={exportJson} title="Резервная копия текущего каталога">
                Экспорт JSON
              </button>
              <button
                type="button"
                className="ce-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Загрузить каталог из файла в рабочую копию (сохранится в БД)"
              >
                Импорт JSON
              </button>
              <button type="button" className="ce-btn ce-btn-danger" onClick={reloadFromDb}>
                Обновить из БД
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="ce-file-hidden"
                onChange={importJson}
              />
            </div>
          </div>

          {showPreview ? (
            <PreviewPanel
              preview={catalog.preview}
              loading={catalog.previewLoading}
              error={catalog.previewError}
              onRefresh={() => void catalog.loadPreview()}
            />
          ) : null}

          <div className="ce-note ce-note-warn">
            <span className="ce-note-tag">Трубы</span>
            Без проекта расчёт труб, фитингов и крепежа ориентировочный, с запасом на повороты и углы.
            PPR d20: 10 м.п. на водяную точку (пара ХВС+ГВС = ×2); выходы и фитинги — по 6 шт. на точку.
            Крепёж — 1,5 шт. на м.п. трубы (PPR d20 и канализация 50/110 мм). Канализация 50 мм к
            мойке: коэффициент 3,5 м.п. Штробление под трубу: ориентир {SINK_ZONE_GROOVE_METERS} м.п.
            для зоны мойки без проекта (фиксированный коэффициент, не 1:1 с метражом труб).
          </div>

          <div className="ce-note">
            <span className="ce-note-tag">Надбавки</span>
            Накладные 10% и транспорт 5% применяются по решению и в суммы по умолчанию не входят.
            6,4% — резерв на отклонения по трассе и комплектующим (без проекта), отдельной строкой на
            уровне зоны. Работы и материалы — отдельные кубики («монтаж точки» ≠ «монтаж прибора»).
            Тёплый пол / отопление — отдельный модуль, не смешивать с сантехническими зонами.
          </div>

          {plumbingView === "zones" ? (
            <ZonesView
              zones={zones}
              itemsById={itemsById}
              library={items}
              collapsedSubgroups={collapsedSubgroups}
              collapsedZones={collapsedZones}
              sectionTotal={sectionTotal}
              zoneSubtotal={zoneSubtotal}
              zoneRiskAmount={zoneRiskAmount}
              zoneGrandTotal={zoneGrandTotal}
              zoneRiskPercent={zoneRiskPercent}
              zoneRowTotal={zoneRowTotal}
              onToggleSubgroup={toggleSubgroup}
              onToggleZone={toggleZone}
              onAddZone={addZone}
              onUpdateZone={updateZone}
              onUpdateZoneRiskPercent={updateZoneRiskPercent}
              onRemoveZone={removeZone}
              onAddZoneRow={addZoneRow}
              onUpdateZoneRow={updateZoneRow}
              onRemoveZoneRow={removeZoneRow}
              onReplaceZoneVariantRow={replaceZoneVariantRow}
            />
          ) : (
            <LibraryView
              filteredItems={filteredItems}
              totalCount={items.length}
              search={search}
              groupFilter={groupFilter}
              libraryTotals={libraryTotals}
              onSearch={setSearch}
              onGroupFilter={setGroupFilter}
              onAddItem={addLibraryItem}
              onUpdateItem={updateItem}
              onUpdateNumber={updateItemNumber}
              onRemoveItem={removeLibraryItem}
            />
          )}
        </>
      )}
    </div>
  );
}

// =================== Представление "Зоны" ===================

type ZonesViewProps = {
  zones: CatalogZone[];
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  collapsedSubgroups: Set<string>;
  collapsedZones: Set<string>;
  sectionTotal: number;
  zoneSubtotal: (zone: CatalogZone) => number;
  zoneRiskAmount: (zone: CatalogZone) => number;
  zoneGrandTotal: (zone: CatalogZone) => number;
  zoneRiskPercent: (zone: CatalogZone) => number;
  zoneRowTotal: (row: { atomicItemId: string; quantity: number; coefficient?: number }) => number;
  onToggleSubgroup: (subgroup: string) => void;
  onToggleZone: (zoneId: string) => void;
  onAddZone: (subgroup: ZoneSubgroup) => void;
  onUpdateZone: (id: string, patch: Partial<CatalogZone>) => void;
  onUpdateZoneRiskPercent: (zoneId: string, value: string) => void;
  onRemoveZone: (id: string, title: string) => void;
  onAddZoneRow: (zoneId: string, atomicItemId: string) => void;
  onUpdateZoneRow: (
    zoneId: string,
    atomicItemId: string,
    field: "quantity" | "coefficient",
    value: string,
    scope?: "base" | "variant",
  ) => void;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
};

function variantReplacementCandidates(library: CatalogItem[], atomicItemId: string): CatalogItem[] {
  const isFaucet = atomicItemId.includes("faucet");
  const isSink = atomicItemId.includes("sink");
  const kitchen = library.filter((item) => item.group === "Кухня");
  if (isFaucet) {
    return kitchen.filter((item) => item.id.includes("faucet") || item.publicTitle.toLowerCase().includes("смеситель"));
  }
  if (isSink) {
    return kitchen.filter((item) => item.id.includes("sink") || item.publicTitle.toLowerCase().includes("мойк"));
  }
  return kitchen.length > 0 ? kitchen : library;
}

function ZonesView(props: ZonesViewProps) {
  const { zones, itemsById, library, zoneGrandTotal, zoneRowTotal } = props;

  return (
    <div className="ce-zones">
      <div className="ce-meta">
        Подгрупп: <strong>{ZONE_SUBGROUPS.length}</strong> · Зон: <strong>{zones.length}</strong> · Итог раздела
        «Сантехника» (с резервом): <strong>{formatMoney(props.sectionTotal)} ₽</strong>
      </div>

      {ZONE_SUBGROUPS.map((subgroup) => {
        const subgroupZones = zones.filter((zone) => zone.subgroup === subgroup);
        const subgroupTotal = subgroupZones.reduce((sum, zone) => sum + zoneGrandTotal(zone), 0);
        const collapsed = props.collapsedSubgroups.has(subgroup);
        return (
          <section key={subgroup} className="ce-subgroup">
            <header className="ce-subgroup-head">
              <button
                type="button"
                className="ce-disclosure"
                onClick={() => props.onToggleSubgroup(subgroup)}
                aria-expanded={!collapsed}
              >
                <span className={`ce-chevron${collapsed ? "" : " is-open"}`}>▶</span>
                <span className="ce-subgroup-title">{ZONE_SUBGROUP_LABELS[subgroup]}</span>
                <span className="ce-subgroup-count">{subgroupZones.length} зон</span>
              </button>
              <div className="ce-subgroup-right">
                <span className="ce-subgroup-total">{formatMoney(subgroupTotal)} ₽</span>
                <button type="button" className="ce-btn ce-btn-primary ce-btn-sm" onClick={() => props.onAddZone(subgroup)}>
                  + Добавить зону
                </button>
              </div>
            </header>

            {!collapsed && (
              <div className="ce-subgroup-body">
                {subgroupZones.length === 0 ? (
                  <div className="ce-zone-empty">В подгруппе пока нет зон. Нажмите «Добавить зону».</div>
                ) : (
                  subgroupZones.map((zone) => (
                    <ZoneCard
                      key={zone.id}
                      zone={zone}
                      collapsed={props.collapsedZones.has(zone.id)}
                      itemsById={itemsById}
                      library={library}
                      subtotal={props.zoneSubtotal(zone)}
                      riskAmount={props.zoneRiskAmount(zone)}
                      grandTotal={props.zoneGrandTotal(zone)}
                      riskPercent={props.zoneRiskPercent(zone)}
                      zoneRowTotal={zoneRowTotal}
                      onToggle={() => props.onToggleZone(zone.id)}
                      onUpdateZone={props.onUpdateZone}
                      onUpdateZoneRiskPercent={props.onUpdateZoneRiskPercent}
                      onRemoveZone={props.onRemoveZone}
                      onAddZoneRow={props.onAddZoneRow}
                      onUpdateZoneRow={props.onUpdateZoneRow}
                      onRemoveZoneRow={props.onRemoveZoneRow}
                      onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

type ZoneCardProps = {
  zone: CatalogZone;
  collapsed: boolean;
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  subtotal: number;
  riskAmount: number;
  grandTotal: number;
  riskPercent: number;
  zoneRowTotal: (row: { atomicItemId: string; quantity: number; coefficient?: number }) => number;
  onToggle: () => void;
  onUpdateZone: (id: string, patch: Partial<CatalogZone>) => void;
  onUpdateZoneRiskPercent: (zoneId: string, value: string) => void;
  onRemoveZone: (id: string, title: string) => void;
  onAddZoneRow: (zoneId: string, atomicItemId: string) => void;
  onUpdateZoneRow: (
    zoneId: string,
    atomicItemId: string,
    field: "quantity" | "coefficient",
    value: string,
    scope?: "base" | "variant",
  ) => void;
  onRemoveZoneRow: (zoneId: string, atomicItemId: string) => void;
  onReplaceZoneVariantRow: (zoneId: string, oldAtomicItemId: string, newAtomicItemId: string) => void;
};

function ZoneCompositionTable(props: {
  rows: ZoneCompositionRow[];
  zoneId: string;
  scope: "base" | "variant";
  itemsById: Map<string, CatalogItem>;
  library: CatalogItem[];
  zoneRowTotal: ZoneCardProps["zoneRowTotal"];
  onUpdateZoneRow: ZoneCardProps["onUpdateZoneRow"];
  onRemoveZoneRow: ZoneCardProps["onRemoveZoneRow"];
  onReplaceZoneVariantRow: ZoneCardProps["onReplaceZoneVariantRow"];
  removable?: boolean;
}) {
  const {
    rows,
    zoneId,
    scope,
    itemsById,
    library,
    zoneRowTotal,
    onUpdateZoneRow,
    onRemoveZoneRow,
    onReplaceZoneVariantRow,
    removable = true,
  } = props;

  return rows.map((row) => {
    const item = itemsById.get(row.atomicItemId);
    const qtyHint = compositionQtyHint(row.atomicItemId, row.quantity, item?.unit);
    return (
      <tr key={`${scope}-${row.atomicItemId}`} className={item ? "" : "ce-row-missing"}>
        <td className="ce-col-id ce-mono ce-readonly">{row.atomicItemId}</td>
        <td>
          {scope === "variant" ? (
            <select
              className="ce-cell-input"
              value={row.atomicItemId}
              title="Заменить позицию в пакете"
              onChange={(event) => onReplaceZoneVariantRow(zoneId, row.atomicItemId, event.target.value)}
            >
              {variantReplacementCandidates(library, row.atomicItemId).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.publicTitle} — {formatMoney(itemUnitPrice(candidate))} ₽/{candidate.unit}
                </option>
              ))}
            </select>
          ) : (
            <span className="ce-readonly">{item ? item.publicTitle : "⚠ позиция не найдена в библиотеке"}</span>
          )}
        </td>
        <td className="ce-readonly">{item ? item.unit : "—"}</td>
        <td className="ce-num ce-readonly">{item ? formatMoney(itemUnitPrice(item)) : "0"}</td>
        <td>
          <input
            className="ce-cell-input ce-num"
            type="number"
            min={0}
            step={item?.unit === "м.п." ? "0.1" : item?.unit === "шт" ? "0.01" : "1"}
            value={row.quantity}
            onChange={(event) => onUpdateZoneRow(zoneId, row.atomicItemId, "quantity", event.target.value, scope)}
          />
          {qtyHint && <span className="ce-qty-hint">{qtyHint}</span>}
        </td>
        <td>
          <input
            className="ce-cell-input ce-num"
            type="number"
            step="0.01"
            placeholder="1"
            value={row.coefficient ?? ""}
            onChange={(event) =>
              onUpdateZoneRow(zoneId, row.atomicItemId, "coefficient", event.target.value, scope)
            }
          />
        </td>
        <td className="ce-num ce-readonly ce-total-cell">{formatMoney(zoneRowTotal(row))}</td>
        <td className="ce-col-actions">
          {removable && (
            <button
              type="button"
              className="ce-row-delete"
              title="Убрать из состава"
              onClick={() => onRemoveZoneRow(zoneId, row.atomicItemId)}
            >
              ✕
            </button>
          )}
        </td>
      </tr>
    );
  });
}

function ZoneCard(props: ZoneCardProps) {
  const { zone, itemsById, library, subtotal, riskAmount, grandTotal, riskPercent } = props;
  const [pickValue, setPickValue] = useState("");
  const activeVariant = activePriceClassVariant(zone);

  function handlePick(value: string) {
    if (!value) return;
    props.onAddZoneRow(zone.id, value);
    setPickValue("");
  }

  return (
    <div className="ce-zone">
      <header className="ce-zone-head">
        <button
          type="button"
          className="ce-disclosure"
          onClick={props.onToggle}
          aria-expanded={!props.collapsed}
        >
          <span className={`ce-chevron${props.collapsed ? "" : " is-open"}`}>▶</span>
        </button>
        <input
          className="ce-zone-title"
          value={zone.title}
          onChange={(event) => props.onUpdateZone(zone.id, { title: event.target.value })}
          placeholder="Название зоны"
        />
        <span className="ce-zone-count">{zoneCompositionRows(zone).length} поз.</span>
        <span className="ce-zone-total" title="Итого с резервом">
          {formatMoney(grandTotal)} ₽
        </span>
        <button
          type="button"
          className="ce-row-delete"
          title="Удалить зону"
          onClick={() => props.onRemoveZone(zone.id, zone.title)}
        >
          ✕
        </button>
      </header>

      {!props.collapsed && (
        <div className="ce-zone-body">
          <input
            className="ce-zone-desc"
            value={zone.description ?? ""}
            onChange={(event) => props.onUpdateZone(zone.id, { description: event.target.value })}
            placeholder="Описание зоны (опционально)"
          />

          {zone.priceClassVariants && zone.priceClassVariants.length > 0 && (
            <div className="ce-price-classes">
              <span className="ce-price-classes-label">Пакет:</span>
              <div className="ce-price-class-tabs">
                {zone.priceClassVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`ce-price-class-tab${
                      (zone.activePriceClassId ?? zone.priceClassVariants![0].id) === variant.id ? " is-active" : ""
                    }`}
                    onClick={() => props.onUpdateZone(zone.id, { activePriceClassId: variant.id })}
                  >
                    {variant.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ce-zone-risk-field">
            <label className="ce-zone-risk-label">
              Резерв на неопределённость, %
              <input
                className="ce-input ce-zone-risk-input"
                type="number"
                min={0}
                step="0.1"
                value={zone.riskPercent ?? DEFAULT_ZONE_RISK_PERCENT}
                onChange={(event) => props.onUpdateZoneRiskPercent(zone.id, event.target.value)}
              />
            </label>
          </div>

          <table className="ce-table ce-zone-table">
            <thead>
              <tr>
                <th className="ce-col-id">ID</th>
                <th className="ce-col-title">Позиция</th>
                <th className="ce-col-select">Ед.</th>
                <th className="ce-col-num">Цена за ед. ₽</th>
                <th className="ce-col-num">Кол-во</th>
                <th className="ce-col-num">Коэф.</th>
                <th className="ce-col-num ce-col-total">Итого ₽</th>
                <th className="ce-col-actions" aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {zone.items.length === 0 && !activeVariant?.items.length ? (
                <tr>
                  <td colSpan={8} className="ce-empty">
                    Состав пуст. Добавьте позицию из библиотеки ниже.
                  </td>
                </tr>
              ) : (
                <>
                  <ZoneCompositionTable
                    rows={zone.items}
                    zoneId={zone.id}
                    scope="base"
                    itemsById={itemsById}
                    library={library}
                    zoneRowTotal={props.zoneRowTotal}
                    onUpdateZoneRow={props.onUpdateZoneRow}
                    onRemoveZoneRow={props.onRemoveZoneRow}
                    onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                  />
                  {activeVariant && activeVariant.items.length > 0 && (
                    <>
                      <tr className="ce-variant-separator">
                        <td colSpan={8}>
                          {activeVariant.label}: смеситель и мойка — выберите другую позицию в списке или измените кол-во
                        </td>
                      </tr>
                      <ZoneCompositionTable
                        rows={activeVariant.items}
                        zoneId={zone.id}
                        scope="variant"
                        itemsById={itemsById}
                        library={library}
                        zoneRowTotal={props.zoneRowTotal}
                        onUpdateZoneRow={props.onUpdateZoneRow}
                        onRemoveZoneRow={props.onRemoveZoneRow}
                        onReplaceZoneVariantRow={props.onReplaceZoneVariantRow}
                        removable={false}
                      />
                    </>
                  )}
                </>
              )}
              <tr className="ce-zone-summary-row">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Subtotal (атомы)
                </td>
                <td className="ce-num ce-readonly">{formatMoney(subtotal)}</td>
                <td />
              </tr>
              <tr className="ce-zone-summary-row ce-zone-summary-risk">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Резерв на неопределённость ({riskPercent}%)
                </td>
                <td className="ce-num ce-readonly">{formatMoney(riskAmount)}</td>
                <td />
              </tr>
              <tr className="ce-zone-summary-row ce-zone-summary-total">
                <td colSpan={6} className="ce-readonly ce-zone-summary-label">
                  Итого зоны
                </td>
                <td className="ce-num ce-readonly ce-total-cell">{formatMoney(grandTotal)}</td>
                <td />
              </tr>
            </tbody>
          </table>

          <div className="ce-zone-add">
            <select
              className="ce-input ce-zone-pick"
              value={pickValue}
              onChange={(event) => handlePick(event.target.value)}
            >
              <option value="">+ Добавить позицию в состав…</option>
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.group}] {item.publicTitle} — {formatMoney(itemUnitPrice(item))} ₽/{item.unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// =================== Представление "Библиотека" ===================

type LibraryViewProps = {
  filteredItems: CatalogItem[];
  totalCount: number;
  search: string;
  groupFilter: "all" | CatalogGroup;
  libraryTotals: { base: number; withCoef: number };
  onSearch: (value: string) => void;
  onGroupFilter: (value: "all" | CatalogGroup) => void;
  onAddItem: () => void;
  onUpdateItem: (id: string, patch: Partial<CatalogItem>) => void;
  onUpdateNumber: (id: string, field: keyof CatalogItem, value: string) => void;
  onRemoveItem: (id: string) => void;
};

function LibraryView(props: LibraryViewProps) {
  const { filteredItems } = props;
  return (
    <>
      <div className="ce-toolbar">
        <div className="ce-toolbar-group">
          <input
            type="search"
            className="ce-input ce-search"
            placeholder="Поиск по названию, id, комментарию…"
            value={props.search}
            onChange={(event) => props.onSearch(event.target.value)}
          />
          <select
            className="ce-input"
            value={props.groupFilter}
            onChange={(event) => props.onGroupFilter(event.target.value as "all" | CatalogGroup)}
          >
            <option value="all">Все группы</option>
            {CATALOG_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </div>
        <div className="ce-toolbar-group">
          <button type="button" className="ce-btn ce-btn-primary" onClick={props.onAddItem}>
            + Добавить позицию в библиотеку
          </button>
        </div>
      </div>

      <div className="ce-meta">
        Показано: <strong>{filteredItems.length}</strong> из {props.totalCount} позиций · База:{" "}
        <strong>{formatMoney(props.libraryTotals.base)} ₽</strong> · С коэффициентом:{" "}
        <strong>{formatMoney(props.libraryTotals.withCoef)} ₽</strong>
      </div>

      <div className="ce-table-wrap">
        <table className="ce-table">
          <thead>
            <tr>
              <th className="ce-col-id">ID</th>
              <th className="ce-col-title">Публичное название</th>
              <th className="ce-col-tech">Тех. название / комментарий</th>
              <th className="ce-col-select">Категория</th>
              <th className="ce-col-select">Ед.</th>
              <th className="ce-col-num">Работа ₽</th>
              <th className="ce-col-num">Материал ₽</th>
              <th className="ce-col-num">Оборуд. ₽</th>
              <th className="ce-col-num">Расходн. ₽</th>
              <th className="ce-col-num">Коэф.</th>
              <th className="ce-col-num ce-col-total">База ₽</th>
              <th className="ce-col-num ce-col-total">Итого ₽</th>
              <th className="ce-col-select">Группа</th>
              <th className="ce-col-select">Источник</th>
              <th className="ce-col-actions" aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={15} className="ce-empty">
                  Ничего не найдено по текущему фильтру.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className="ce-col-id">
                    <input
                      className="ce-cell-input ce-mono"
                      value={item.id}
                      onChange={(event) => props.onUpdateItem(item.id, { id: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.publicTitle}
                      onChange={(event) => props.onUpdateItem(item.id, { publicTitle: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input"
                      value={item.technicalTitle}
                      onChange={(event) => props.onUpdateItem(item.id, { technicalTitle: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.category}
                      onChange={(event) =>
                        props.onUpdateItem(item.id, { category: event.target.value as CatalogCategory })
                      }
                    >
                      {CATALOG_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.unit}
                      onChange={(event) => props.onUpdateItem(item.id, { unit: event.target.value as CatalogUnit })}
                    >
                      {CATALOG_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.works}
                      onChange={(event) => props.onUpdateNumber(item.id, "works", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.materials}
                      onChange={(event) => props.onUpdateNumber(item.id, "materials", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.equipment}
                      onChange={(event) => props.onUpdateNumber(item.id, "equipment", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      value={item.consumables}
                      onChange={(event) => props.onUpdateNumber(item.id, "consumables", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="ce-cell-input ce-num"
                      type="number"
                      step="0.01"
                      value={item.coefficient}
                      onChange={(event) => props.onUpdateNumber(item.id, "coefficient", event.target.value)}
                    />
                  </td>
                  <td className="ce-num ce-readonly">{formatMoney(baseSum(item))}</td>
                  <td className="ce-num ce-readonly ce-total-cell">{formatMoney(itemUnitPrice(item))}</td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.group}
                      onChange={(event) => props.onUpdateItem(item.id, { group: event.target.value as CatalogGroup })}
                    >
                      {CATALOG_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="ce-cell-input"
                      value={item.source}
                      onChange={(event) => props.onUpdateItem(item.id, { source: event.target.value as CatalogSource })}
                    >
                      {CATALOG_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="ce-col-actions">
                    <button
                      type="button"
                      className="ce-row-delete"
                      title="Удалить позицию"
                      onClick={() => props.onRemoveItem(item.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// =================== Превью публичной цены (snapshot/preview) ===================

type PreviewPanelProps = {
  preview: PlumbingSnapshotPreview | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

function PreviewPanel(props: PreviewPanelProps) {
  const { preview, loading, error } = props;
  return (
    <section className="ce-preview">
      <header className="ce-preview-head">
        <div>
          <strong>Превью публичной цены</strong>
          <span className="ce-preview-hint">
            Итог зоны/пакета уже с запечённым резервом — как в публичном снапшоте (источник — БД).
          </span>
        </div>
        <button type="button" className="ce-btn ce-btn-sm" onClick={props.onRefresh} disabled={loading}>
          {loading ? "Считаю…" : "Обновить превью"}
        </button>
      </header>

      {error ? (
        <div className="ce-note ce-note-warn" role="alert">
          <span className="ce-note-tag">Ошибка</span>
          {error}
        </div>
      ) : null}

      {!preview && !loading && !error ? (
        <div className="ce-empty">Нажмите «Обновить превью», чтобы получить публичные суммы из БД.</div>
      ) : null}

      {preview ? (
        <div className="ce-preview-body">
          <div className="ce-meta">
            Версия снапшота: <strong>{preview.version}</strong> · Зон: <strong>{preview.zones.length}</strong> ·
            Позиций: <strong>{preview.items.length}</strong>
          </div>
          <table className="ce-table">
            <thead>
              <tr>
                <th className="ce-col-title">Зона</th>
                <th className="ce-col-select">Подгруппа</th>
                <th className="ce-col-num">Резерв %</th>
                <th className="ce-col-num">Пакет</th>
                <th className="ce-col-num ce-col-total">Публичный итог ₽</th>
              </tr>
            </thead>
            <tbody>
              {preview.zones.map((zone) => {
                const activeRow = zone.packages.find((pkg) => pkg.code === zone.activePackage);
                return (
                  <tr key={zone.code}>
                    <td>{zone.title}</td>
                    <td className="ce-readonly">{zone.subgroup}</td>
                    <td className="ce-num ce-readonly">{zone.riskPercent}</td>
                    <td className="ce-num ce-readonly">
                      {zone.activePackage ? zone.activePackage.toUpperCase() : "—"}
                    </td>
                    <td className="ce-num ce-readonly ce-total-cell">
                      {formatMoney(activeRow ? activeRow.total : zone.total)} ₽
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default CatalogEditor;
