import type { ReactNode } from "react";

import type { DoorsStageReadyProps } from "../doors/types";

export function EditorSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="doors-workbench-editor-section">
      <div className="doors-workbench-editor-section-title">
        <span aria-hidden="true" />
        <h4>{props.title}</h4>
      </div>
      {props.children}
    </section>
  );
}

export function SummaryCell(props: { label: string; value: string }) {
  return (
    <div className="doors-workbench-summary-cell">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

export function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="field-label field-label-compact field-label-row">
        <span>{props.label}</span>
      </div>
      <textarea
        className="text-input text-input-compact doors-workbench-textarea"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
      />
    </label>
  );
}

export function autosaveLabel(state: DoorsStageReadyProps["projectDoorAutosaveState"], busy: boolean) {
  if (busy || state === "saving") return "Сохраняю...";
  if (state === "pending") return "Сохранится автоматически";
  if (state === "error") return "Ошибка сохранения";
  if (state === "saved") return "Сохранено";
  return "Автосохранение";
}
