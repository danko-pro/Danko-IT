import { useState } from "react";
import type { ProjectCardLedgerDocument, ProjectCardLedgerEntry, ProjectCardLedgerStatus } from "../model/project-model";
import { AccountingRow } from "./project-accounting-ledger-row";
import { CATEGORY_OPTIONS, LedgerDocumentKind, STATUS_OPTIONS } from "./project-accounting-ledger-config";
import { LedgerField, LedgerSelect } from "./project-accounting-ledger-controls";

export function ProjectAccountingLedgerTable(props: {
  entries: ProjectCardLedgerEntry[];
  onAddEntry: () => void;
  onUpdateEntry: (entryId: string, patch: Partial<ProjectCardLedgerEntry>) => void;
  onUploadDocument: (entryId: string, kind: LedgerDocumentKind, file: File) => void;
  onUpdateDocument: (
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
  onDeleteEntry: (entryId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectCardLedgerStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const visibleEntries = props.entries.filter((entry) => {
    if (statusFilter !== "all" && entry.status !== statusFilter) {
      return false;
    }

    if (categoryFilter !== "all" && entry.category !== categoryFilter) {
      return false;
    }

    if (!search.trim()) {
      return true;
    }

    const haystack = [
      entry.category,
      entry.item,
      entry.owner,
      entry.counterparty,
      entry.invoiceDocument?.title ?? "",
      entry.actDocument?.title ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  return (
    <div className="dashboard-ledger-table-shell">
      <div className="dashboard-ledger-table-head">
        <div>
          <div className="dashboard-ledger-table-title">Реестр объекта</div>
          <div className="dashboard-ledger-table-caption">Ручной учёт строк, документов и контрольных дат.</div>
        </div>

        <div className="dashboard-ledger-table-actions">
          <span className="dashboard-ledger-table-count">{visibleEntries.length} строк</span>
          <button type="button" className="dashboard-ledger-toolbar-button" onClick={props.onAddEntry}>
            + Строка
          </button>
        </div>
      </div>

      <div className="dashboard-ledger-toolbar">
        <div className="dashboard-ledger-toolbar-group dashboard-ledger-toolbar-group-grow">
          <div className="dashboard-ledger-toolbar-label">Поиск</div>
          <LedgerField
            type="text"
            value={search}
            placeholder="Статья, контрагент, документ"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="dashboard-ledger-toolbar-group">
          <div className="dashboard-ledger-toolbar-label">Статус</div>
          <LedgerSelect
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ProjectCardLedgerStatus | "all")}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </LedgerSelect>
        </div>

        <div className="dashboard-ledger-toolbar-group">
          <div className="dashboard-ledger-toolbar-label">Категория</div>
          <LedgerSelect value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">Все категории</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </LedgerSelect>
        </div>

        <button
          type="button"
          className="dashboard-ledger-toolbar-secondary"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setCategoryFilter("all");
          }}
        >
          Сбросить
        </button>
      </div>

      <table className="dashboard-ledger-table dashboard-ledger-table-editable">
        <colgroup>
          <col style={{ width: "3%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "1%" }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Категория</th>
            <th>Подстатья</th>
            <th>Ответственный</th>
            <th>Контрагент</th>
            <th>Статус</th>
            <th>Счёт</th>
            <th>Дата счёта</th>
            <th>Акт</th>
            <th>Дата акта</th>
            <th>План</th>
            <th>Факт</th>
            <th>Контроль</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleEntries.length ? (
            visibleEntries.map((entry, index) => (
              <AccountingRow
                key={entry.id}
                index={index}
                entry={entry}
                onUpdateEntry={props.onUpdateEntry}
                onUploadDocument={props.onUploadDocument}
                onUpdateDocument={props.onUpdateDocument}
                onDeleteEntry={props.onDeleteEntry}
              />
            ))
          ) : (
            <tr className="dashboard-ledger-empty-row">
              <td className="dashboard-ledger-empty-cell" colSpan={14}>
                По текущим фильтрам строк нет. Сбрось фильтры или добавь новую строку.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
