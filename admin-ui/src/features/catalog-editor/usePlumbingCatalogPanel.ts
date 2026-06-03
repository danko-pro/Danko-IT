import { useMemo, useRef, useState, type ChangeEvent } from "react";

import type { PlumbingCatalogController } from "./api/client";
import {
  DEFAULT_ZONE_RISK_PERCENT,
  type CatalogGroup,
  type CatalogItem,
  type CatalogZone,
  type ZoneSubgroup,
} from "./plumbing-seed";
import {
  baseSum,
  isCatalogItem,
  isCatalogZone,
  itemUnitPrice,
  makeNewItemId,
  makeNewZoneId,
  normalizeItem,
  normalizeZone,
  zoneCompositionRows,
  zoneRiskPercent,
} from "./plumbing-catalog-model";

export type PlumbingView = "zones" | "library";

export function usePlumbingCatalogPanel(catalog: PlumbingCatalogController) {
  const { items, zones, setItems, setZones } = catalog;
  const [plumbingView, setPlumbingView] = useState<PlumbingView>("zones");
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

  function importJson(event: ChangeEvent<HTMLInputElement>) {
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

  return {
    items,
    zones,
    plumbingView,
    setPlumbingView,
    search,
    setSearch,
    groupFilter,
    setGroupFilter,
    collapsedSubgroups,
    collapsedZones,
    showPreview,
    fileInputRef,
    itemsById,
    filteredItems,
    libraryTotals,
    sectionTotal,
    zoneSubtotal,
    zoneRiskAmount,
    zoneGrandTotal,
    zoneRiskPercent,
    zoneRowTotal,
    updateItem,
    updateItemNumber,
    addLibraryItem,
    removeLibraryItem,
    addZone,
    updateZone,
    removeZone,
    addZoneRow,
    updateZoneRow,
    updateZoneRiskPercent,
    removeZoneRow,
    replaceZoneVariantRow,
    toggleSubgroup,
    toggleZone,
    reloadFromDb,
    togglePreview,
    exportJson,
    importJson,
  };
}

export type PlumbingCatalogPanelState = ReturnType<typeof usePlumbingCatalogPanel>;
