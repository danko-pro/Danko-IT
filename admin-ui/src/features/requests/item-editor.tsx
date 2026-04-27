import { Button } from "../../shared/controls";
import { Field } from "../../shared/ui";
import type { RequestItemFormState } from "../../shared/types";

type RequestItemEditorProps = {
  form: RequestItemFormState;
  setForm: React.Dispatch<React.SetStateAction<RequestItemFormState>>;
  busy: boolean;
  submitLabel: string;
  busyLabel: string;
  titlePlaceholder: string;
  notePlaceholder: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
};

export function RequestItemEditor(props: RequestItemEditorProps) {
  return (
    <form className={props.className ?? "space-y-3"} onSubmit={(event) => void props.onSubmit(event)}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Название позиции"
          value={props.form.title}
          onChange={(value) => props.setForm((current) => ({ ...current, title: value }))}
          placeholder={props.titlePlaceholder}
        />
        <Field
          label="Комментарий"
          value={props.form.note}
          onChange={(value) => props.setForm((current) => ({ ...current, note: value }))}
          placeholder={props.notePlaceholder}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Field
          label="Количество"
          value={props.form.quantity}
          onChange={(value) => props.setForm((current) => ({ ...current, quantity: value }))}
          placeholder="12"
        />
        <Field
          label="Ед."
          value={props.form.unit}
          onChange={(value) => props.setForm((current) => ({ ...current, unit: value }))}
          placeholder="шт"
        />
        <Field
          label="Толщина, мм"
          value={props.form.thickness_mm}
          onChange={(value) => props.setForm((current) => ({ ...current, thickness_mm: value }))}
          placeholder="12.5"
        />
        <Field
          label="Длина, мм"
          value={props.form.length_mm}
          onChange={(value) => props.setForm((current) => ({ ...current, length_mm: value }))}
          placeholder="3000"
        />
        <Field
          label="Ширина, мм"
          value={props.form.width_mm}
          onChange={(value) => props.setForm((current) => ({ ...current, width_mm: value }))}
          placeholder="1200"
        />
      </div>

      <div className={`flex flex-wrap gap-2 ${props.onCancel ? "" : "justify-end"}`}>
        <Button type="submit" disabled={props.busy}>
          {props.busy ? props.busyLabel : props.submitLabel}
        </Button>
        {props.onCancel ? (
          <Button variant="secondary" onClick={props.onCancel}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}
