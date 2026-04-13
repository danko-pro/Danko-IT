import { formatDisplayDate } from "../model/project-accounting-format";
import type {
  ProjectCardLedgerDocument,
  ProjectCardLedgerEntry,
  ProjectCardLedgerStatus,
} from "../model/project-model";
import {
  CATEGORY_OPTIONS,
  LedgerDocumentKind,
  STATUS_OPTIONS,
  categoryToneClass,
  parseNumberInput,
  requiresAct,
  requiresInvoice,
  statusSelectToneClass,
} from "./project-accounting-ledger-config";
import { DocumentEditorCell, LedgerField, LedgerSelect } from "./project-accounting-ledger-controls";

export function AccountingRow(props: {
  index: number;
  entry: ProjectCardLedgerEntry;
  onUpdateEntry: (entryId: string, patch: Partial<ProjectCardLedgerEntry>) => void;
  onUploadDocument: (entryId: string, kind: LedgerDocumentKind, file: File) => void;
  onUpdateDocument: (
    entryId: string,
    kind: LedgerDocumentKind,
    patch: Partial<ProjectCardLedgerDocument>,
  ) => void;
  onDeleteEntry: (entryId: string) => void;
}) {
  return (
    <tr className="dashboard-ledger-row">
      <td className="dashboard-ledger-cell dashboard-ledger-cell-index">{props.index + 1}</td>

      <td className="dashboard-ledger-cell">
        <LedgerSelect
          value={props.entry.category}
          toneClass={categoryToneClass(props.entry.category)}
          onChange={(event) => props.onUpdateEntry(props.entry.id, { category: event.target.value })}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </LedgerSelect>
      </td>

      <td className="dashboard-ledger-cell">
        <LedgerField
          type="text"
          value={props.entry.item}
          placeholder="Подстатья"
          onChange={(event) => props.onUpdateEntry(props.entry.id, { item: event.target.value })}
        />
      </td>

      <td className="dashboard-ledger-cell">
        <LedgerField
          type="text"
          value={props.entry.owner}
          placeholder="Ответственный"
          onChange={(event) => props.onUpdateEntry(props.entry.id, { owner: event.target.value })}
        />
      </td>

      <td className="dashboard-ledger-cell">
        <LedgerField
          type="text"
          value={props.entry.counterparty}
          placeholder="Контрагент"
          onChange={(event) => props.onUpdateEntry(props.entry.id, { counterparty: event.target.value })}
        />
      </td>

      <td className="dashboard-ledger-cell">
        <div className="dashboard-ledger-status-editor">
          <LedgerSelect
            value={props.entry.status}
            toneClass={statusSelectToneClass(props.entry.status)}
            onChange={(event) =>
              props.onUpdateEntry(props.entry.id, {
                status: event.target.value as ProjectCardLedgerStatus,
              })
            }
          >
            {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </LedgerSelect>

          <div className="dashboard-ledger-status-note">
            {requiresInvoice(props.entry.status)
              ? requiresAct(props.entry.status)
                ? "Счёт + акт"
                : "Нужен счёт"
              : "Можно позже"}
          </div>
        </div>
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-doc">
        <DocumentEditorCell
          kind="invoice"
          document={props.entry.invoiceDocument}
          status={props.entry.status}
          onUpload={(file) => props.onUploadDocument(props.entry.id, "invoice", file)}
          onUpdate={(patch) => props.onUpdateDocument(props.entry.id, "invoice", patch)}
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-date">
        <LedgerField
          type="date"
          value={props.entry.invoiceDocument?.date ?? ""}
          disabled={!props.entry.invoiceDocument}
          onChange={(event) => props.onUpdateDocument(props.entry.id, "invoice", { date: event.target.value })}
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-doc">
        <DocumentEditorCell
          kind="act"
          document={props.entry.actDocument}
          status={props.entry.status}
          onUpload={(file) => props.onUploadDocument(props.entry.id, "act", file)}
          onUpdate={(patch) => props.onUpdateDocument(props.entry.id, "act", patch)}
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-date">
        <LedgerField
          type="date"
          value={props.entry.actDocument?.date ?? ""}
          disabled={!props.entry.actDocument}
          onChange={(event) => props.onUpdateDocument(props.entry.id, "act", { date: event.target.value })}
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-amount">
        <LedgerField
          type="number"
          min="0"
          step="0.01"
          value={props.entry.planAmount ? String(props.entry.planAmount) : ""}
          placeholder="План"
          onChange={(event) =>
            props.onUpdateEntry(props.entry.id, { planAmount: parseNumberInput(event.target.value) })
          }
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-amount">
        <LedgerField
          type="number"
          min="0"
          step="0.01"
          value={props.entry.actualAmount ? String(props.entry.actualAmount) : ""}
          placeholder="Факт"
          onChange={(event) =>
            props.onUpdateEntry(props.entry.id, { actualAmount: parseNumberInput(event.target.value) })
          }
        />
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-date">
        <div className="dashboard-ledger-field-stack">
          <LedgerField
            type="date"
            value={props.entry.controlDate}
            onChange={(event) => props.onUpdateEntry(props.entry.id, { controlDate: event.target.value })}
          />
          <div className="dashboard-ledger-secondary">
            {props.entry.controlDate ? formatDisplayDate(props.entry.controlDate) : "—"}
          </div>
        </div>
      </td>

      <td className="dashboard-ledger-cell dashboard-ledger-cell-action">
        <button
          type="button"
          className="dashboard-ledger-row-delete"
          aria-label="Удалить строку"
          onClick={() => props.onDeleteEntry(props.entry.id)}
        >
          ×
        </button>
      </td>
    </tr>
  );
}
