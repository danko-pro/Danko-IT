import type { PlumbingCatalogController } from "./api/client";
import { CatalogViewTabs, type CatalogViewTabOption } from "./CatalogViewTabs";
import { SINK_ZONE_GROOVE_METERS } from "./plumbing-seed";
import { PlumbingLibraryView } from "./PlumbingLibraryView";
import { PlumbingPreviewPanel } from "./PlumbingPreviewPanel";
import { PlumbingZonesView } from "./PlumbingZonesView";
import { usePlumbingCatalogPanel, type PlumbingView } from "./usePlumbingCatalogPanel";

const PLUMBING_VIEW_TABS: CatalogViewTabOption<PlumbingView>[] = [
  { value: "zones", label: "Зоны" },
  { value: "library", label: "Библиотека позиций (Сан v1)" },
];

export type PlumbingCatalogPanelProps = {
  catalog: PlumbingCatalogController;
};

export function PlumbingCatalogPanel({ catalog }: PlumbingCatalogPanelProps) {
  const {
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
  } = usePlumbingCatalogPanel(catalog);

  return (
    <>
    <div className="ce-toolbar">
      <CatalogViewTabs
        options={PLUMBING_VIEW_TABS}
        value={plumbingView}
        onChange={setPlumbingView}
        ariaLabel="Раздел сантехники"
      />
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
      <PlumbingPreviewPanel
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
      <PlumbingZonesView
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
      <PlumbingLibraryView
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
  );
}
