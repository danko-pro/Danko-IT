import { DoorsProjectComponentsForm } from "./";
import { DoorsProjectComponentsHeader } from "./";
import { DoorsProjectComponentsList } from "./";
import type {
  DoorsProjectComponentsPanelProps,
  DoorsProjectComponentsReadyProps,
} from "./";

// Комплектация выбранной двери.
// Панель оставлена orchestration-слоем над header, form и list блоками.
export function DoorsProjectComponentsPanel(props: DoorsProjectComponentsPanelProps) {
  return (
    <>
      <div className="section-separator">
        <span>Комплектация и цены</span>
      </div>

      <div className="subpanel p-3 space-y-3">
        <DoorsProjectComponentsHeader selectedDoor={props.selectedDoor} />

        {props.selectedDoor ? (
          <>
            <DoorsProjectComponentsForm {...(props as DoorsProjectComponentsReadyProps)} />
            <DoorsProjectComponentsList
              selectedDoor={props.selectedDoor}
              busyKey={props.busyKey}
              startDoorComponentEdit={props.startDoorComponentEdit}
              onDeleteProjectDoorComponent={props.onDeleteProjectDoorComponent}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Выберите дверь слева, чтобы редактировать её комплектацию.
          </div>
        )}
      </div>
    </>
  );
}
