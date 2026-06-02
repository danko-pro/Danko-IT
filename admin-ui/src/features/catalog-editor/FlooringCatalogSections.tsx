import type { ReactNode } from "react";

import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";
import { FlooringCoveringsWorkspace } from "./FlooringCoveringsWorkspace";

type FormatterProps = {
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
};

export type FlooringCoveringsSectionProps = {
  rows: FlooringSnapshotDisplayRow[];
  selectedId: number | null;
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  onDelete: (row: FlooringSnapshotDisplayRow) => void;
  formatMoney: (value: number) => string;
  consumablesSummaryPerM2: (rates: Record<string, number>) => string;
  editor: ReactNode;
};

export function FlooringCoveringsSection({
  rows,
  selectedId,
  onEdit,
  onDelete,
  formatMoney,
  consumablesSummaryPerM2,
  editor,
}: FlooringCoveringsSectionProps) {
  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">Покрытия</h3>
      <FlooringCoveringsWorkspace
        rows={rows}
        selectedId={selectedId}
        formatMoney={formatMoney}
        consumablesSummaryPerM2={consumablesSummaryPerM2}
        onEdit={onEdit}
        onDelete={onDelete}
        editor={editor}
      />
    </section>
  );
}

export type FlooringPreparationsSectionProps = FormatterProps & {
  rows: FlooringSnapshotDisplayRow[];
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  onDelete: (row: FlooringSnapshotDisplayRow) => void;
  children?: ReactNode;
};

export function FlooringPreparationsSection({
  rows,
  onEdit,
  onDelete,
  formatMoney,
  children,
}: FlooringPreparationsSectionProps) {
  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">Подготовка</h3>
      <div className="ce-table-wrap ce-flooring-table-wrap">
        <table className="ce-table ce-flooring-table">
          <thead>
            <tr>
              <th className="ce-col-id">Код</th>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Работа ₽/м²</th>
              <th className="ce-col-num">Материал ₽/м²</th>
              <th className="ce-col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="ce-empty">
                  Подготовки не найдены в snapshot.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code}>
                  <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                  <td className="ce-readonly">{row.title}</td>
                  <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                  <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                  <td className="ce-col-actions">
                    <div className="ce-row-actions">
                      <button
                        type="button"
                        className="ce-row-action"
                        disabled={!row.catalogId}
                        title="Редактировать"
                        onClick={() => onEdit(row)}
                      >
                        Изм.
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {children}
    </section>
  );
}

export type FlooringLayoutsSectionProps = FormatterProps & {
  rows: FlooringSnapshotDisplayRow[];
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  onDelete: (row: FlooringSnapshotDisplayRow) => void;
  children?: ReactNode;
};

export function FlooringLayoutsSection({
  rows,
  onEdit,
  onDelete,
  formatMoney,
  formatPercent,
  children,
}: FlooringLayoutsSectionProps) {
  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">Укладка</h3>
      <div className="ce-table-wrap ce-flooring-table-wrap">
        <table className="ce-table ce-flooring-table">
          <thead>
            <tr>
              <th className="ce-col-id">Код</th>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Работа ₽/м²</th>
              <th className="ce-col-num">Коэф. работы</th>
              <th className="ce-col-num">Доп. отход %</th>
              <th className="ce-col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="ce-empty">
                  Укладки не найдены в snapshot.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code}>
                  <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                  <td className="ce-readonly">{row.title}</td>
                  <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                  <td className="ce-num ce-readonly">{row.rates.laborFactor}</td>
                  <td className="ce-num ce-readonly">{formatPercent(row.rates.additionalWastePercent)}</td>
                  <td className="ce-col-actions">
                    <div className="ce-row-actions">
                      <button
                        type="button"
                        className="ce-row-action"
                        disabled={!row.catalogId}
                        title="Редактировать"
                        onClick={() => onEdit(row)}
                      >
                        Изм.
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {children}
    </section>
  );
}
