import { useState } from "react";
import { DropdownCheck, DropdownRoot, DropdownTrigger } from "../../../../shared/controls";
import type { ProjectCardLedgerCounterparty } from "../../model/project-model";
import {
  ProjectAccountingLedgerBuilderPopover,
  useProjectAccountingLedgerBuilderPopover,
} from "./project-accounting-ledger-builder-popover";
import { counterpartyTriggerLabel, counterpartyTriggerMeta } from "./project-accounting-ledger-builder-utils";

type ProjectAccountingLedgerCounterpartyPickerProps = {
  details: ProjectCardLedgerCounterparty | null;
  fallbackLabel: string;
  options: ProjectCardLedgerCounterparty[];
  onSelect: (value: ProjectCardLedgerCounterparty) => void;
  onChangeField: (field: keyof ProjectCardLedgerCounterparty, value: string) => void;
};

export function ProjectAccountingLedgerCounterpartyPicker(
  props: ProjectAccountingLedgerCounterpartyPickerProps,
) {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = counterpartyTriggerLabel(props.details, props.fallbackLabel);
  const activeMeta = counterpartyTriggerMeta(props.details);
  const popover = useProjectAccountingLedgerBuilderPopover({
    isOpen,
    onClose: () => setIsOpen(false),
    preferredMaxHeight: 430,
    minimumHeight: 220,
    bodyClassName: "dashboard-ledger-counterparty-cloud-body",
    resizable: {
      storageKey: "dashboard-ledger:popover:counterparty",
      defaultSize: {
        width: 432,
        height: 340,
      },
      minWidth: 360,
      minHeight: 260,
    },
  });

  return (
    <DropdownRoot
      rootRef={popover.rootRef}
      open={isOpen}
      className="dashboard-ledger-counterparty-select"
      openClassName="dashboard-ledger-counterparty-select-open"
    >
      <DropdownTrigger
        open={isOpen}
        className="dashboard-ledger-counterparty-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="dashboard-ledger-counterparty-trigger-body">
          <span className="dashboard-ledger-counterparty-trigger-title">{activeLabel}</span>
          <span className="dashboard-ledger-counterparty-trigger-meta">{activeMeta}</span>
        </span>
        <span className="dashboard-ledger-counterparty-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7">
            <path d="M5 4.75h6a1.25 1.25 0 0 1 1.25 1.25v4A1.25 1.25 0 0 1 11 11.25H5A1.25 1.25 0 0 1 3.75 10V6A1.25 1.25 0 0 1 5 4.75Z" />
            <path d="M6 7.25h4" />
            <path d="M6 9h2.5" />
          </svg>
        </span>
      </DropdownTrigger>

      {isOpen ? (
        <ProjectAccountingLedgerBuilderPopover
          popover={popover}
          ariaLabel="Контрагент"
          className="dashboard-ledger-counterparty-cloud"
        >
          <div className="dashboard-ledger-counterparty-list" role="listbox" aria-label="Известные контрагенты">
            {props.options.map((option) => {
              const selected =
                option.legalName.trim() === (props.details?.legalName.trim() ?? "") &&
                option.inn.trim() === (props.details?.inn.trim() ?? "");

              return (
                <button
                  key={`${option.inn}:${option.legalName}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={
                    selected
                      ? "ui-dropdown-option ui-dropdown-option-selected dashboard-ledger-counterparty-option dashboard-ledger-counterparty-option-selected"
                      : "ui-dropdown-option dashboard-ledger-counterparty-option"
                  }
                  onClick={() => {
                    props.onSelect(option);
                    setIsOpen(false);
                  }}
                >
                  <DropdownCheck selected={selected} />
                  <span className="dashboard-ledger-counterparty-option-body">
                    <span className="dashboard-ledger-counterparty-option-title">{option.legalName}</span>
                    <span className="dashboard-ledger-counterparty-option-meta">
                      {option.inn ? `ИНН ${option.inn}` : "Без ИНН"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="dashboard-ledger-counterparty-form">
            <label className="dashboard-ledger-counterparty-field">
              <span className="dashboard-ledger-counterparty-field-label">ИНН</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={props.details?.inn ?? ""}
                placeholder="7704123456"
                onChange={(event) => props.onChangeField("inn", event.target.value)}
              />
            </label>

            <label className="dashboard-ledger-counterparty-field dashboard-ledger-counterparty-field-wide">
              <span className="dashboard-ledger-counterparty-field-label">Юридическое название</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={props.details?.legalName ?? ""}
                placeholder="ООО Баустрой"
                onChange={(event) => props.onChangeField("legalName", event.target.value)}
              />
            </label>

            <label className="dashboard-ledger-counterparty-field">
              <span className="dashboard-ledger-counterparty-field-label">Контактный менеджер</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={props.details?.managerName ?? ""}
                placeholder="Илья Смирнов"
                onChange={(event) => props.onChangeField("managerName", event.target.value)}
              />
            </label>

            <label className="dashboard-ledger-counterparty-field">
              <span className="dashboard-ledger-counterparty-field-label">Почта</span>
              <input
                type="email"
                className="dashboard-ledger-item-input"
                value={props.details?.email ?? ""}
                placeholder="mail@company.ru"
                onChange={(event) => props.onChangeField("email", event.target.value)}
              />
            </label>

            <label className="dashboard-ledger-counterparty-field">
              <span className="dashboard-ledger-counterparty-field-label">Телефон</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={props.details?.phone ?? ""}
                placeholder="+7 999 123-45-67"
                onChange={(event) => props.onChangeField("phone", event.target.value)}
              />
            </label>

            <label className="dashboard-ledger-counterparty-field">
              <span className="dashboard-ledger-counterparty-field-label">Мессенджер</span>
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={props.details?.messenger ?? ""}
                placeholder="@manager"
                onChange={(event) => props.onChangeField("messenger", event.target.value)}
              />
            </label>
          </div>
        </ProjectAccountingLedgerBuilderPopover>
      ) : null}
    </DropdownRoot>
  );
}
