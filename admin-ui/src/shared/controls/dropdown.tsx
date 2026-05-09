import type { ReactNode, Ref } from "react";

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function DropdownRoot(props: {
  open: boolean;
  rootRef?: Ref<HTMLDivElement>;
  className?: string;
  openClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={props.rootRef}
      className={joinClassNames(
        "ui-dropdown-root",
        props.className,
        props.open && "ui-dropdown-root-open",
        props.open && props.openClassName,
      )}
    >
      {props.children}
    </div>
  );
}

export function DropdownTrigger(props: {
  open: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={joinClassNames("ui-dropdown-trigger", props.className)}
      aria-label={props.ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={props.open}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function DropdownChevron() {
  return (
    <span className="ui-dropdown-trigger-glyph" aria-hidden="true">
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.6">
        <path d="m3.5 5.25 3.5 3.5 3.5-3.5" />
      </svg>
    </span>
  );
}

export function DropdownCheck(props: { selected: boolean }) {
  return (
    <span className="ui-dropdown-option-check" aria-hidden="true">
      {props.selected ? (
        <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
          <path d="m2.75 7.5 2.5 2.5 6-6" />
        </svg>
      ) : null}
    </span>
  );
}
