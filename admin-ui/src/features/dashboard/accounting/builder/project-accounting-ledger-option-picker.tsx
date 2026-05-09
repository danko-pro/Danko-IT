import { useState } from "react";
import {
  DropdownCheck,
  DropdownChevron,
  DropdownRoot,
  DropdownTrigger,
} from "../../../../shared/controls";
import {
  ProjectAccountingLedgerBuilderPopover,
  useProjectAccountingLedgerBuilderPopover,
} from "./project-accounting-ledger-builder-popover";

type ProjectAccountingLedgerOptionPickerProps = {
  value: string;
  options: string[];
  triggerFallback: string;
  createPlaceholder: string;
  listAriaLabel: string;
  resizableStorageKey?: string;
  onChange: (value: string) => void;
  onCreateOption: (value: string) => void;
};

const CATEGORY_POPOVER_STORAGE_KEY = "dashboard-ledger:popover:category";
const CATEGORY_POPOVER_DEFAULT_SIZE = {
  width: 320,
  height: 280,
};

export function ProjectAccountingLedgerOptionPicker(props: ProjectAccountingLedgerOptionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const activeValue = props.value || props.triggerFallback;
  const popover = useProjectAccountingLedgerBuilderPopover({
    isOpen,
    onClose: () => setIsOpen(false),
    preferredMaxHeight: 360,
    minimumHeight: 160,
    bodyClassName: props.resizableStorageKey ? "dashboard-ledger-item-cloud-body" : undefined,
    resizable: props.resizableStorageKey
      ? {
          storageKey: props.resizableStorageKey ?? CATEGORY_POPOVER_STORAGE_KEY,
          defaultSize: CATEGORY_POPOVER_DEFAULT_SIZE,
          minWidth: 272,
          minHeight: 200,
        }
      : undefined,
  });

  const commitDraft = () => {
    const nextValue = draft.trim();
    if (!nextValue) {
      return;
    }

    props.onCreateOption(nextValue);
    props.onChange(nextValue);
    setDraft("");
    setIsOpen(false);
  };

  return (
    <DropdownRoot
      rootRef={popover.rootRef}
      open={isOpen}
      className="dashboard-ledger-item-select"
      openClassName="dashboard-ledger-item-select-open"
    >
      <DropdownTrigger
        open={isOpen}
        className="dashboard-ledger-item-trigger"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="ui-dropdown-trigger-value dashboard-ledger-item-trigger-value">{activeValue}</span>
        <DropdownChevron />
      </DropdownTrigger>

      {isOpen ? (
        <ProjectAccountingLedgerBuilderPopover
          popover={popover}
          ariaLabel={props.listAriaLabel}
          className="dashboard-ledger-item-cloud"
        >
          <div className="dashboard-ledger-item-cloud-layout">
            <div className="dashboard-ledger-item-list" role="listbox" aria-label={props.listAriaLabel}>
              {props.options.map((option) => {
                const selected = option === props.value;

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={
                      selected
                        ? "ui-dropdown-option ui-dropdown-option-selected dashboard-ledger-item-option dashboard-ledger-item-option-selected"
                        : "ui-dropdown-option dashboard-ledger-item-option"
                    }
                    onClick={() => {
                      props.onChange(option);
                      setIsOpen(false);
                    }}
                  >
                    <DropdownCheck selected={selected} />
                    <span className="dashboard-ledger-item-option-label">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="dashboard-ledger-item-input-shell">
              <input
                type="text"
                className="dashboard-ledger-item-input"
                value={draft}
                placeholder={props.createPlaceholder}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
              />
            </div>
          </div>
        </ProjectAccountingLedgerBuilderPopover>
      ) : null}
    </DropdownRoot>
  );
}
