import type { ReactNode } from "react";

import { normalizeNum } from "./api/flooring-mappers";
import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";

type FormatterProps = {
  formatMoney: (value: number) => string;
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

export type FlooringCoveringsWorkspaceProps = FormatterProps & {
  rows: FlooringSnapshotDisplayRow[];
  selectedId: number | null;
  consumablesSummaryPerM2: (rates: Record<string, number>) => string;
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  onDelete: (row: FlooringSnapshotDisplayRow) => void;
  editor: ReactNode;
};

export function FlooringCoveringsWorkspace({
  rows,
  selectedId,
  formatMoney,
  consumablesSummaryPerM2,
  onEdit,
  onDelete,
  editor,
}: FlooringCoveringsWorkspaceProps) {
  return (
    <div className="ce-flooring-coverings-workspace">
      <div className="ce-flooring-coverings-list" role="listbox" aria-label="Покрытия">
        {rows.length === 0 ? (
          <div className="ce-flooring-coverings-empty">Покрытия не найдены в snapshot.</div>
        ) : (
          rows.map((row) => {
            const isSelected = selectedId !== null && row.catalogId === selectedId;
            const consumablesLabel = consumablesSummaryPerM2(row.rates);
            const totalLabel = `${formatMoney(coveringTotalPerM2(row))} ₽/м²`;

            return (
              <div
                key={row.code}
                role="option"
                aria-selected={isSelected}
                className={`ce-flooring-covering-item${isSelected ? " is-selected" : ""}`}
              >
                <button
                  type="button"
                  className="ce-flooring-covering-item-main"
                  disabled={!row.catalogId}
                  onClick={() => onEdit(row)}
                >
                  <span className="ce-flooring-covering-item-title">{row.title}</span>
                  <span className="ce-flooring-covering-item-code ce-mono">{row.code}</span>
                  <span className="ce-flooring-covering-item-metrics">
                    <span>
                      <span className="ce-flooring-covering-metric-label">Мат.</span>
                      <span className="ce-flooring-covering-metric-value">
                        {formatMoney(row.rates.materialPricePerM2)} ₽/м²
                      </span>
                    </span>
                    <span>
                      <span className="ce-flooring-covering-metric-label">Расх.</span>
                      <span className="ce-flooring-covering-metric-value">{consumablesLabel}</span>
                    </span>
                    <span>
                      <span className="ce-flooring-covering-metric-label">Итого</span>
                      <span className="ce-flooring-covering-metric-value ce-flooring-covering-metric-total">
                        {totalLabel}
                      </span>
                    </span>
                  </span>
                </button>
                <div className="ce-flooring-covering-item-actions">
                  <button
                    type="button"
                    className="ce-row-action ce-row-action-primary"
                    disabled={!row.catalogId}
                    title="Открыть"
                    onClick={() => onEdit(row)}
                  >
                    Открыть
                  </button>
                  <button
                    type="button"
                    className="ce-row-action ce-row-action-danger"
                    disabled={!row.catalogId}
                    title="Удалить"
                    onClick={() => onDelete(row)}
                  >
                    Удал.
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="ce-flooring-covering-detail">
        {editor ?? (
          <div className="ce-flooring-covering-detail-empty">Выберите покрытие слева для редактирования.</div>
        )}
      </div>
    </div>
  );
}
