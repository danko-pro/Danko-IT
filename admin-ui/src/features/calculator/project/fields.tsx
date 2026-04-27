export function WorkspaceInlineField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="calculator-project-workspace-field">
      <span className="calculator-project-workspace-field-label">{props.label}</span>
      <input
        className="calculator-project-workspace-field-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-label={props.label}
      />
    </label>
  );
}

export function WorkspaceNoteField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="calculator-project-workspace-note">
      <span className="calculator-project-workspace-note-label">{props.label}</span>
      <textarea
        className="calculator-project-workspace-note-input"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        aria-label={props.label}
      />
    </label>
  );
}
