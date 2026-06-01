import type { ReactNode } from "react";

import type { FlooringSnapshotDisplayRow } from "./api/flooring-types";

type FormatterProps = {
  formatMoney: (value: number) => string;
  formatPercent: (value: number) => string;
};

export type FlooringCoveringsSectionProps = FormatterProps & {
  rows: FlooringSnapshotDisplayRow[];
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  consumablesSummaryPerM2: (rates: Record<string, number>) => string;
  children?: ReactNode;
};

export function FlooringCoveringsSection({
  rows,
  onEdit,
  formatMoney,
  formatPercent,
  consumablesSummaryPerM2,
  children,
}: FlooringCoveringsSectionProps) {
  return (
    <section className="ce-flooring-section">
      <h3 className="ce-flooring-section-title">Покрытия</h3>
      <div className="ce-table-wrap ce-flooring-table-wrap">
        <table className="ce-table ce-flooring-table">
          <thead>
            <tr>
              <th className="ce-col-id">Код</th>
              <th className="ce-col-title">Название</th>
              <th className="ce-col-num">Материал ₽/м²</th>
              <th className="ce-col-num">Работа ₽/м²</th>
              <th className="ce-col-num">Отход %</th>
              <th className="ce-col-tech">Расходники</th>
              <th className="ce-col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="ce-empty">
                  Покрытия не найдены в snapshot.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code}>
                  <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                  <td className="ce-readonly">{row.title}</td>
                  <td className="ce-num ce-readonly">{formatMoney(row.rates.materialPricePerM2)}</td>
                  <td className="ce-num ce-readonly">{formatMoney(row.rates.laborPricePerM2)}</td>
                  <td className="ce-num ce-readonly">{formatPercent(row.rates.baseWastePercent)}</td>
                  <td className="ce-readonly">{consumablesSummaryPerM2(row.rates)}</td>
                  <td>
                    <button type="button" className="ce-btn ce-btn-sm" disabled={!row.catalogId} onClick={() => onEdit(row)}>
                      Редактировать
                    </button>
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

export type FlooringPreparationsSectionProps = FormatterProps & {
  rows: FlooringSnapshotDisplayRow[];
  onEdit: (row: FlooringSnapshotDisplayRow) => void;
  children?: ReactNode;
};

export function FlooringPreparationsSection({
  rows,
  onEdit,
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
                  <td>
                    <button type="button" className="ce-btn ce-btn-sm" disabled={!row.catalogId} onClick={() => onEdit(row)}>
                      Редактировать
                    </button>
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
  children?: ReactNode;
};

export function FlooringLayoutsSection({
  rows,
  onEdit,
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
              <th className="ce-col-num">Коэф. работы</th>
              <th className="ce-col-num">Доп. отход %</th>
              <th className="ce-col-actions">Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="ce-empty">
                  Укладки не найдены в snapshot.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.code}>
                  <td className="ce-col-id ce-mono ce-readonly">{row.code}</td>
                  <td className="ce-readonly">{row.title}</td>
                  <td className="ce-num ce-readonly">{row.rates.laborFactor}</td>
                  <td className="ce-num ce-readonly">{formatPercent(row.rates.additionalWastePercent)}</td>
                  <td>
                    <button type="button" className="ce-btn ce-btn-sm" disabled={!row.catalogId} onClick={() => onEdit(row)}>
                      Редактировать
                    </button>
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
