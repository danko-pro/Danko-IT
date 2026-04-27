import { Button } from "../../../shared/controls";
import type { RoomsCreateState } from "./types";

type RoomsCreateFormProps = {
  formId: string;
  state: RoomsCreateState;
  setName: (value: string) => void;
  setCeilingHeight: (value: string) => void;
  setAutoPerimeterCalc: (value: boolean) => void;
  isCreating: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  onCancel: () => void;
};

export function RoomsCreateForm(props: RoomsCreateFormProps) {
  const {
    formId,
    state,
    setName,
    setCeilingHeight,
    setAutoPerimeterCalc,
    isCreating,
    onSubmit,
    onCancel,
  } = props;

  return (
    <form id={formId} className="calculator-room-create-fields-form" onSubmit={(event) => void onSubmit(event)}>
      <div className="calculator-room-create-fields">
        <label className="calculator-room-create-field calculator-room-create-field-name">
          <span className="field-label field-label-compact">Название помещения</span>
          <span className="calculator-room-create-input">
            <input
              className="calculator-room-create-input-field"
              value={state.name}
              autoFocus
              placeholder="Например, Кухня-гостиная"
              onChange={(event) => setName(event.target.value)}
            />
          </span>
        </label>

        <label className="calculator-room-create-field calculator-room-create-field-compact">
          <span className="field-label field-label-compact">Потолок = h</span>
          <span className="calculator-room-create-input">
            <input
              className="calculator-room-create-input-field"
              value={state.ceilingHeight}
              inputMode="decimal"
              placeholder="2.7"
              onChange={(event) => setCeilingHeight(event.target.value)}
            />
            {state.ceilingHeight.trim() ? <span className="calculator-room-create-unit">м</span> : null}
          </span>
        </label>
      </div>

      <label className="calculator-room-editor-toggle calculator-room-create-toggle">
        <input
          className="calculator-room-editor-toggle-input"
          type="checkbox"
          checked={state.autoPerimeterCalc}
          onChange={(event) => setAutoPerimeterCalc(event.target.checked)}
        />
        <span className="calculator-room-editor-toggle-box" aria-hidden="true">
          <span className="calculator-room-editor-toggle-mark">✓</span>
        </span>
        <span className="calculator-room-editor-toggle-label">Сразу включить авторасчет периметра</span>
      </label>

      {state.error ? <div className="calculator-room-create-error">{state.error}</div> : null}

      <div className="calculator-room-create-actions">
        <Button type="submit" variant="micro" className="calculator-room-create-submit" disabled={isCreating}>
          {isCreating ? "Создаю..." : "Создать помещение"}
        </Button>
        <Button type="button" variant="micro" disabled={isCreating} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
