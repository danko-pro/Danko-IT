import type { ProjectCardContractEditorProps } from "./project-card-contract-types";

type ProjectCardContractEditorFieldsProps = Pick<
  ProjectCardContractEditorProps,
  "draft" | "isBusy" | "onDraftChange"
>;

export function ProjectCardContractEditorFields(props: ProjectCardContractEditorFieldsProps) {
  return (
    <div className="dashboard-project-contract-editor-grid">
      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">Название договора</span>
        <input
          type="text"
          className="dashboard-project-contract-editor-input"
          value={props.draft.title}
          onChange={(event) => props.onDraftChange("title", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">Номер</span>
        <input
          type="text"
          className="dashboard-project-contract-editor-input"
          value={props.draft.number}
          onChange={(event) => props.onDraftChange("number", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">Подписан</span>
        <input
          type="date"
          className="dashboard-project-contract-editor-input"
          value={props.draft.signedAt}
          onChange={(event) => props.onDraftChange("signedAt", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">Старт</span>
        <input
          type="date"
          className="dashboard-project-contract-editor-input"
          value={props.draft.startDate}
          onChange={(event) => props.onDraftChange("startDate", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">План завершения</span>
        <input
          type="date"
          className="dashboard-project-contract-editor-input"
          value={props.draft.plannedEndDate}
          onChange={(event) => props.onDraftChange("plannedEndDate", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field">
        <span className="dashboard-project-contract-editor-label">Сумма</span>
        <input
          type="number"
          inputMode="decimal"
          className="dashboard-project-contract-editor-input"
          value={props.draft.amount}
          onChange={(event) => props.onDraftChange("amount", event.target.value)}
          disabled={props.isBusy}
        />
      </label>

      <label className="dashboard-project-contract-editor-field dashboard-project-contract-editor-field-wide">
        <span className="dashboard-project-contract-editor-label">Условия оплаты</span>
        <textarea
          className="dashboard-project-contract-editor-textarea"
          value={props.draft.advanceTerms}
          onChange={(event) => props.onDraftChange("advanceTerms", event.target.value)}
          disabled={props.isBusy}
          rows={4}
        />
      </label>
    </div>
  );
}
