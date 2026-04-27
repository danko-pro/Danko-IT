import { RoomsCreateForm } from "./create-form";
import type { RoomsCreatePanelProps } from "./types";
import { useCreateRoom } from "./use-create";

export function RoomsStageCreatePanel(props: RoomsCreatePanelProps) {
  const formId = `calculator-room-create-form-${props.projectId}`;
  const { isOpen, isCreating, state, toggle, reset, submit, setName, setCeilingHeight, setAutoPerimeterCalc } = useCreateRoom(props);

  return (
    <div className={isOpen ? "calculator-room-create-overlay calculator-room-create-overlay-open" : "calculator-room-create-overlay"}>
      {isOpen ? (
        <div className="calculator-room-create-form-shell calculator-room-create-form-shell-open" aria-hidden={false}>
          <div className="calculator-room-create-form-shell-inner">
            <div className="calculator-room-create-form">
              <div className="calculator-room-create-head">
                <div className="calculator-room-create-head-copy">
                  <div className="row-kicker">Новое помещение</div>
                  <div className="calculator-room-create-head-title">Параметры новой комнаты</div>
                </div>
                <button
                  type="button"
                  className="calculator-room-add-button calculator-room-add-button-open"
                  aria-label="Закрыть форму помещения"
                  aria-controls={formId}
                  onClick={reset}
                >
                  <span className="calculator-room-add-button-glyph calculator-room-add-button-glyph-open">+</span>
                </button>
              </div>

              <RoomsCreateForm
                formId={formId}
                state={state}
                setName={setName}
                setCeilingHeight={setCeilingHeight}
                setAutoPerimeterCalc={setAutoPerimeterCalc}
                isCreating={isCreating}
                onSubmit={submit}
                onCancel={reset}
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="dense-row calculator-room-create-trigger"
          aria-label="Добавить помещение"
          aria-controls={formId}
          aria-expanded={false}
          onClick={toggle}
        >
          <span className="calculator-room-create-trigger-copy">
            <span className="row-kicker">Новое помещение</span>
            <span className="calculator-room-create-trigger-title">Добавить комнату для расчета</span>
          </span>
          <span className="calculator-room-create-trigger-icon" aria-hidden="true">
            <span className="calculator-room-add-button-glyph">+</span>
          </span>
        </button>
      )}
    </div>
  );
}
