import type { ReactNode } from "react";

import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";
import { EditIcon, PlusIcon, TrashIcon } from "./CatalogEditorIcons";
import { normalizeNum } from "./api/flooring-mappers";

type FlooringCatalogSectionKind = "coverings" | "preparations" | "layouts";

type FlooringCatalogSectionConfig = {
  kind: FlooringCatalogSectionKind;
  title: string;
  rows: FlooringSnapshotDisplayRow[];
  selectedId: number | null;
  renderMetrics: (row: FlooringSnapshotDisplayRow) => CatalogMetric[];
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  onDelete: (row: FlooringSnapshotDisplayRow) => void;
  onPromote: (row: FlooringSnapshotDisplayRow) => void;
};

type CatalogMetric = {
  label: string;
  title: string;
  value: string;
  tone?: "total";
};

type FlooringCatalogWorkspaceProps = {
  coverings: {
    rows: FlooringSnapshotDisplayRow[];
    selectedId: number | null;
    onEdit: (row: FlooringSnapshotDisplayRow) => void;
    onDelete: (row: FlooringSnapshotDisplayRow) => void;
    onPromote: (row: FlooringSnapshotDisplayRow) => void;
  };
  preparations: {
    rows: FlooringSnapshotDisplayRow[];
    selectedId: number | null;
    onEdit: (row: FlooringSnapshotDisplayRow) => void;
    onDelete: (row: FlooringSnapshotDisplayRow) => void;
    onPromote: (row: FlooringSnapshotDisplayRow) => void;
  };
  layouts: {
    rows: FlooringSnapshotDisplayRow[];
    selectedId: number | null;
    onEdit: (row: FlooringSnapshotDisplayRow) => void;
    onDelete: (row: FlooringSnapshotDisplayRow) => void;
    onPromote: (row: FlooringSnapshotDisplayRow) => void;
  };
  editor: ReactNode;
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
  consumablesSummaryPerM2: (rates: Record<string, number>) => string;
};

function consumablesTotalNumeric(rates: Record<string, number>): number {
  return (
    normalizeNum(rates.underlayPricePerM2) +
    normalizeNum(rates.adhesivePricePerM2) +
    normalizeNum(rates.primerPricePerM2) +
    normalizeNum(rates.svpPricePerM2) +
    normalizeNum(rates.groutPricePerM2) +
    normalizeNum(rates.toolConsumablesPerM2)
  );
}

function coveringTotalPerM2(row: FlooringSnapshotDisplayRow): number {
  return normalizeNum(row.rates.materialPricePerM2) + consumablesTotalNumeric(row.rates);
}

function preparationTotalPerM2(row: FlooringSnapshotDisplayRow): number {
  return normalizeNum(row.rates.laborPricePerM2) + normalizeNum(row.rates.materialPricePerM2);
}

export function FlooringCatalogWorkspace({
  coverings,
  preparations,
  layouts,
  editor,
  formatMoney,
  formatPercent,
  consumablesSummaryPerM2,
}: FlooringCatalogWorkspaceProps) {
  const sections: FlooringCatalogSectionConfig[] = [
    {
      kind: "coverings",
      title: "Покрытия",
      rows: coverings.rows,
      selectedId: coverings.selectedId,
      onEdit: coverings.onEdit,
      onDelete: coverings.onDelete,
      onPromote: coverings.onPromote,
      renderMetrics: (row) => [
        { label: "М", title: "Материал", value: `${formatMoney(row.rates.materialPricePerM2)} ₽/м²` },
        { label: "Р", title: "Расходники", value: consumablesSummaryPerM2(row.rates) },
        { label: "Σ", title: "Итого", value: `${formatMoney(coveringTotalPerM2(row))} ₽/м²`, tone: "total" },
      ],
    },
    {
      kind: "preparations",
      title: "Подготовка",
      rows: preparations.rows,
      selectedId: preparations.selectedId,
      onEdit: preparations.onEdit,
      onDelete: preparations.onDelete,
      onPromote: preparations.onPromote,
      renderMetrics: (row) => [
        { label: "Т", title: "Работа", value: `${formatMoney(row.rates.laborPricePerM2)} ₽/м²` },
        { label: "М", title: "Материал", value: `${formatMoney(row.rates.materialPricePerM2)} ₽/м²` },
        { label: "Σ", title: "Итого", value: `${formatMoney(preparationTotalPerM2(row))} ₽/м²`, tone: "total" },
      ],
    },
    {
      kind: "layouts",
      title: "Укладка",
      rows: layouts.rows,
      selectedId: layouts.selectedId,
      onEdit: layouts.onEdit,
      onDelete: layouts.onDelete,
      onPromote: layouts.onPromote,
      renderMetrics: (row) => [
        { label: "Т", title: "Работа", value: `${formatMoney(row.rates.laborPricePerM2)} ₽/м²` },
        { label: "К", title: "Коэффициент", value: String(row.rates.laborFactor ?? 1) },
        { label: "%", title: "Отход", value: formatPercent(row.rates.additionalWastePercent), tone: "total" },
      ],
    },
  ];

  return (
    <section className="ce-flooring-catalog-workspace">
      <div className="ce-flooring-catalog-sidebar" aria-label="Каталог полов">
        {sections.map((section) => (
          <FlooringCatalogSidebarSection key={section.kind} section={section} />
        ))}
      </div>
      <div className="ce-flooring-catalog-detail">
        {editor ?? <div className="ce-flooring-catalog-detail-empty">Выберите строку</div>}
      </div>
    </section>
  );
}

function FlooringCatalogSidebarSection({ section }: { section: FlooringCatalogSectionConfig }) {
  return (
    <section className="ce-flooring-catalog-sidebar-section">
      <header className="ce-flooring-catalog-sidebar-head">
        <h3>{section.title}</h3>
        <span>{section.rows.length}</span>
      </header>
      <div className="ce-flooring-catalog-card-list" role="listbox" aria-label={section.title}>
        {section.rows.length === 0 ? (
          <div className="ce-flooring-catalog-empty">Нет строк</div>
        ) : (
          section.rows.map((row) => (
            <FlooringCatalogCard key={`${section.kind}-${row.code}`} row={row} section={section} />
          ))
        )}
      </div>
    </section>
  );
}

function FlooringCatalogCard({
  row,
  section,
}: {
  row: FlooringSnapshotDisplayRow;
  section: FlooringCatalogSectionConfig;
}) {
  const hasCatalog = row.catalogId != null;
  const isSelected = hasCatalog && section.selectedId !== null && row.catalogId === section.selectedId;
  const metrics = section.renderMetrics(row);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={`ce-flooring-catalog-card${isSelected ? " is-selected" : ""}${hasCatalog ? "" : " is-snapshot"}`}
    >
      <button
        type="button"
        className="ce-flooring-catalog-card-main"
        onClick={() => (hasCatalog ? section.onEdit(row) : section.onPromote(row))}
      >
        <span className="ce-flooring-catalog-card-head">
          <span className="ce-flooring-catalog-card-title" title={row.title}>
            {row.title}
          </span>
          <span className="ce-flooring-catalog-card-code ce-mono" title={row.code}>
            {row.code}
          </span>
        </span>
        <span className="ce-flooring-catalog-card-metrics">
          {metrics.map((metric) => (
            <span key={metric.title} className="ce-flooring-catalog-card-metric" title={`${metric.title}: ${metric.value}`}>
              <span className="ce-flooring-catalog-card-metric-label">{metric.label}</span>
              <span
                className={`ce-flooring-catalog-card-metric-value${
                  metric.tone === "total" ? " is-total" : ""
                }`}
              >
                {metric.value}
              </span>
            </span>
          ))}
        </span>
      </button>
      <div className="ce-flooring-catalog-card-actions">
        {hasCatalog ? (
          <>
            <button
              type="button"
              className="ce-icon-action ce-icon-action-primary"
              aria-label={`Редактировать: ${row.title}`}
              title="Редактировать"
              onClick={() => section.onEdit(row)}
            >
              <EditIcon className="ce-action-icon" />
            </button>
            <button
              type="button"
              className="ce-icon-action ce-icon-action-danger"
              aria-label={`Удалить: ${row.title}`}
              title="Удалить"
              onClick={() => section.onDelete(row)}
            >
              <TrashIcon className="ce-action-icon" />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="ce-icon-action ce-icon-action-primary"
            aria-label={`Создать в БД: ${row.title}`}
            title="Создать в БД"
            onClick={() => section.onPromote(row)}
          >
            <PlusIcon className="ce-action-icon" />
          </button>
        )}
      </div>
    </div>
  );
}
