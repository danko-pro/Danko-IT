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

export function IconDots() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconReset() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
