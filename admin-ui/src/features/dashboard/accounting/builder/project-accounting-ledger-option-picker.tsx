import { useState } from "react";
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
    <div
      ref={popover.rootRef}
      className={isOpen ? "dashboard-ledger-item-select dashboard-ledger-item-select-open" : "dashboard-ledger-item-select"}
    >
      <button
        type="button"
        className="dashboard-ledger-item-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="dashboard-ledger-item-trigger-value">{activeValue}</span>
        <span className="dashboard-ledger-item-trigger-glyph" aria-hidden="true">
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.6">
            <path d="m3.5 5.25 3.5 3.5 3.5-3.5" />
          </svg>
        </span>
      </button>

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
                        ? "dashboard-ledger-item-option dashboard-ledger-item-option-selected"
                        : "dashboard-ledger-item-option"
                    }
                    onClick={() => {
                      props.onChange(option);
                      setIsOpen(false);
                    }}
                  >
                    <span className="dashboard-ledger-item-option-check" aria-hidden="true">
                      {selected ? (
                        <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                          <path d="m2.75 7.5 2.5 2.5 6-6" />
                        </svg>
                      ) : null}
                    </span>
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
    </div>
  );
}
