// Компактные встроенные action-controls.

export function InlineAddButton(props: {
  ariaLabel: string;
  title?: string;
  onClick: () => void;
  className?: string;
}) {
  const className = props.className ? `inline-add-button ${props.className}` : "inline-add-button";

  return (
    <button type="button" className={className} aria-label={props.ariaLabel} title={props.title} onClick={props.onClick}>
      <span className="inline-add-button-glyph" aria-hidden="true">
        +
      </span>
    </button>
  );
}
