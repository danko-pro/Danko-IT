import { useEffect, useState } from "react";
import { ledgerStatusView } from "../../model/project-accounting-format";
import type { ProjectCardLedgerStatus } from "../../model/project-model";
import {
  ProjectAccountingLedgerBuilderPopover,
  useProjectAccountingLedgerBuilderPopover,
} from "./project-accounting-ledger-builder-popover";
import {
  LEDGER_STATUS_OPTIONS,
  ledgerDeviationView,
  ledgerTriggerAmountView,
  parseLedgerAmountInput,
} from "./project-accounting-ledger-builder-utils";

type ProjectAccountingLedgerStatusPickerProps = {
  status: ProjectCardLedgerStatus;
  planAmount: number;
  actualAmount: number;
  onChangeStatus: (value: ProjectCardLedgerStatus) => void;
  onChangePlanAmount: (value: number) => void;
  onChangeActualAmount: (value: number) => void;
};

export function ProjectAccountingLedgerStatusPicker(props: ProjectAccountingLedgerStatusPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [planDraft, setPlanDraft] = useState(props.planAmount > 0 ? String(props.planAmount) : "");
  const [actualDraft, setActualDraft] = useState(props.actualAmount > 0 ? String(props.actualAmount) : "");
  const statusView = ledgerStatusView(props.status);
  const deviation = ledgerDeviationView(props.status, props.planAmount, props.actualAmount);
  const triggerAmount = ledgerTriggerAmountView(props.status, props.planAmount, props.actualAmount);
  const selectedStatusOption =
    LEDGER_STATUS_OPTIONS.find((option) => option.value === props.status) ?? LEDGER_STATUS_OPTIONS[0];
  const popover = useProjectAccountingLedgerBuilderPopover({
    isOpen,
    onClose: () => setIsOpen(false),
    preferredMaxHeight: 430,
    minimumHeight: 240,
    bodyClassName: "dashboard-ledger-status-cloud-body",
    resizable: {
      storageKey: "dashboard-ledger:popover:status",
      defaultSize: {
        width: 368,
        height: 336,
      },
      minWidth: 320,
      minHeight: 260,
    },
  });

  useEffect(() => {
    setPlanDraft(props.planAmount > 0 ? String(props.planAmount) : "");
  }, [props.planAmount]);

  useEffect(() => {
    setActualDraft(props.actualAmount > 0 ? String(props.actualAmount) : "");
  }, [props.actualAmount]);

  const commitPlanAmount = (value: string) => {
    props.onChangePlanAmount(parseLedgerAmountInput(value));
  };

  const commitActualAmount = (value: string) => {
    const nextActualAmount = parseLedgerAmountInput(value);
    props.onChangeActualAmount(nextActualAmount);
  };

  const handleStatusChange = (nextStatus: ProjectCardLedgerStatus) => {
    props.onChangeStatus(nextStatus);
  };

  return (
    <div
      ref={popover.rootRef}
      className={isOpen ? "dashboard-ledger-status-select dashboard-ledger-status-select-open" : "dashboard-ledger-status-select"}
    >
      <button
        type="button"
        className="dashboard-ledger-status-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="dashboard-ledger-status-trigger-body">
          <span className={`dashboard-ledger-status-trigger-label dashboard-ledger-status-trigger-label-${statusView.tone}`}>
            {statusView.label}
          </span>
          <span className={`dashboard-ledger-status-trigger-amount dashboard-ledger-status-trigger-amount-${triggerAmount.amountTone}`}>
            {triggerAmount.amountLabel}
          </span>
          {triggerAmount.metaLabel ? (
            <span className={`dashboard-ledger-status-trigger-meta dashboard-ledger-status-trigger-meta-${triggerAmount.metaTone}`}>
              {triggerAmount.metaLabel}
            </span>
          ) : null}
        </span>
        <span className="dashboard-ledger-status-trigger-icon" aria-hidden="true">
          ₽
        </span>
      </button>

      {isOpen ? (
        <ProjectAccountingLedgerBuilderPopover
          popover={popover}
          ariaLabel="Статус оплаты"
          className="dashboard-ledger-status-cloud"
        >
          <div className="dashboard-ledger-status-stage-list" role="listbox" aria-label="Этап оплаты">
            {LEDGER_STATUS_OPTIONS.map((option) => {
              const optionView = ledgerStatusView(option.value);
              const selected = option.value === props.status;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? "dashboard-ledger-status-stage dashboard-ledger-status-stage-selected"
                      : "dashboard-ledger-status-stage"
                  }
                  onClick={() => handleStatusChange(option.value)}
                >
                  <span className={`dashboard-ledger-status-stage-pill dashboard-ledger-status-pill-${optionView.tone}`}>
                    {optionView.label}
                  </span>
                  <span className="dashboard-ledger-status-stage-note">{option.note}</span>
                </button>
              );
            })}
          </div>

          <div className="dashboard-ledger-status-amounts">
            <label className="dashboard-ledger-status-field">
              <span className="dashboard-ledger-status-field-label">План</span>
              <div className="dashboard-ledger-status-field-shell">
                <input
                  type="text"
                  inputMode="decimal"
                  className="dashboard-ledger-item-input dashboard-ledger-status-input"
                  value={planDraft}
                  placeholder="23000"
                  onChange={(event) => setPlanDraft(event.target.value)}
                  onBlur={() => commitPlanAmount(planDraft)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitPlanAmount(planDraft);
                    }
                  }}
                />
                <span className="dashboard-ledger-status-field-suffix">₽</span>
              </div>
            </label>

            <label className="dashboard-ledger-status-field">
              <span className="dashboard-ledger-status-field-label">Счёт / факт</span>
              <div className="dashboard-ledger-status-field-shell">
                <input
                  type="text"
                  inputMode="decimal"
                  className="dashboard-ledger-item-input dashboard-ledger-status-input"
                  value={actualDraft}
                  placeholder="25000"
                  onChange={(event) => setActualDraft(event.target.value)}
                  onBlur={() => commitActualAmount(actualDraft)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitActualAmount(actualDraft);
                    }
                  }}
                />
                <span className="dashboard-ledger-status-field-suffix">₽</span>
              </div>
            </label>
          </div>

          <div className={`dashboard-ledger-status-summary dashboard-ledger-status-summary-${deviation.tone}`}>
            <div className="dashboard-ledger-status-summary-head">
              <span className="dashboard-ledger-status-summary-title">{deviation.title}</span>
              <span className="dashboard-ledger-status-summary-amount">{deviation.amountLabel}</span>
            </div>
            <div className="dashboard-ledger-status-summary-head dashboard-ledger-status-summary-head-secondary">
              <span className="dashboard-ledger-status-summary-title dashboard-ledger-status-summary-title-secondary">
                {deviation.deltaTitle}
              </span>
              <span className="dashboard-ledger-status-summary-amount dashboard-ledger-status-summary-amount-secondary">
                {deviation.deltaAmount}
              </span>
            </div>
            <div className="dashboard-ledger-status-summary-note">{selectedStatusOption.note}</div>
          </div>
        </ProjectAccountingLedgerBuilderPopover>
      ) : null}
    </div>
  );
}
