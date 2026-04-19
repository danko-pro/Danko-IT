import type { ProjectCardLedgerCounterparty } from "../../model/project-model";
import { ProjectAccountingLedgerBuilderColumn } from "./project-accounting-ledger-builder-column";
import {
  counterpartyFromEntry,
  createEmptyCounterpartyDetails,
} from "./project-accounting-ledger-builder-utils";
import type { ProjectAccountingLedgerEntryBuilderProps } from "./project-accounting-ledger-entry-builder-types";
import { ProjectAccountingLedgerCounterpartyPicker } from "./project-accounting-ledger-counterparty-picker";
import { ProjectAccountingLedgerDocumentPicker } from "./project-accounting-ledger-document-picker";
import { ProjectAccountingLedgerOptionPicker } from "./project-accounting-ledger-option-picker";
import { ProjectAccountingLedgerStatusPicker } from "./project-accounting-ledger-status-picker";

// Контент строки ledger-builder:
// все поля редактирования и локальная сборка patch-обновлений
// живут рядом, отдельно от shell/delete-обвязки строки.
export function ProjectAccountingLedgerEntryGrid(
  props: ProjectAccountingLedgerEntryBuilderProps,
) {
  const entryCounterpartyDetails = counterpartyFromEntry(props.entry);

  const updateCounterpartyField = (
    field: keyof ProjectCardLedgerCounterparty,
    value: string,
  ) => {
    const nextDetails = {
      ...(entryCounterpartyDetails ?? createEmptyCounterpartyDetails(props.entry.counterparty)),
      [field]: value,
    };

    props.onUpdateEntry(props.entry.id, {
      counterparty: nextDetails.legalName.trim(),
      counterpartyDetails: nextDetails,
    });
  };

  return (
    <div className="dashboard-ledger-builder-grid dashboard-ledger-builder-grid-compact">
      <ProjectAccountingLedgerBuilderColumn title="Категория затрат" hideTitle>
        <ProjectAccountingLedgerOptionPicker
          value={props.entry.category}
          options={props.categoryOptions}
          resizableStorageKey="dashboard-ledger:popover:category"
          triggerFallback="Выбрать категорию затрат"
          createPlaceholder="Новая категория затрат"
          listAriaLabel="Категория затрат"
          onChange={(value) => props.onUpdateEntry(props.entry.id, { category: value })}
          onCreateOption={props.onCreateCategoryOption}
        />
      </ProjectAccountingLedgerBuilderColumn>

      <ProjectAccountingLedgerBuilderColumn
        title="Статья затрат"
        className="dashboard-ledger-builder-column-wide"
        hideTitle
      >
        <ProjectAccountingLedgerOptionPicker
          value={props.entry.item}
          options={props.expenseItemOptions}
          resizableStorageKey="dashboard-ledger:popover:item"
          triggerFallback="Выбрать статью затрат"
          createPlaceholder="Новая статья затрат"
          listAriaLabel="Статья затрат"
          onChange={(value) => props.onUpdateEntry(props.entry.id, { item: value })}
          onCreateOption={props.onCreateExpenseItemOption}
        />
      </ProjectAccountingLedgerBuilderColumn>

      <ProjectAccountingLedgerBuilderColumn
        title="Контрагент"
        className="dashboard-ledger-builder-column-counterparty"
        hideTitle
      >
        <ProjectAccountingLedgerCounterpartyPicker
          details={entryCounterpartyDetails}
          fallbackLabel={props.entry.counterparty}
          options={props.counterpartyOptions}
          onSelect={(value) =>
            props.onUpdateEntry(props.entry.id, {
              counterparty: value.legalName,
              counterpartyDetails: { ...value },
            })
          }
          onChangeField={updateCounterpartyField}
        />
      </ProjectAccountingLedgerBuilderColumn>

      <ProjectAccountingLedgerBuilderColumn
        title="Статус оплаты"
        className="dashboard-ledger-builder-column-status"
        hideTitle
      >
        <ProjectAccountingLedgerStatusPicker
          status={props.entry.status}
          planAmount={props.entry.planAmount}
          actualAmount={props.entry.actualAmount}
          onChangeStatus={(value) => props.onUpdateEntry(props.entry.id, { status: value })}
          onChangePlanAmount={(value) =>
            props.onUpdateEntry(props.entry.id, { planAmount: value })
          }
          onChangeActualAmount={(value) =>
            props.onUpdateEntry(props.entry.id, { actualAmount: value })
          }
        />
      </ProjectAccountingLedgerBuilderColumn>

      <ProjectAccountingLedgerBuilderColumn
        title="Счёт"
        className="dashboard-ledger-builder-column-document"
        hideTitle
      >
        <ProjectAccountingLedgerDocumentPicker
          kind="invoice"
          status={props.entry.status}
          document={props.entry.invoiceDocument}
          onUpload={(file) => props.onUploadDocument(props.entry.id, "invoice", file)}
          onUpdate={(patch) => props.onUpdateDocument(props.entry.id, "invoice", patch)}
        />
      </ProjectAccountingLedgerBuilderColumn>

      <ProjectAccountingLedgerBuilderColumn
        title="Акт"
        className="dashboard-ledger-builder-column-document"
        hideTitle
      >
        <ProjectAccountingLedgerDocumentPicker
          kind="act"
          status={props.entry.status}
          document={props.entry.actDocument}
          onUpload={(file) => props.onUploadDocument(props.entry.id, "act", file)}
          onUpdate={(patch) => props.onUpdateDocument(props.entry.id, "act", patch)}
        />
      </ProjectAccountingLedgerBuilderColumn>
    </div>
  );
}
