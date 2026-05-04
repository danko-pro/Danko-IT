import type { DoorsStageReadyProps } from "../doors/types";
import { IconCopy, IconReset, IconTrash } from "./editor-parts";

export function DoorActionMenu(props: {
  open: boolean;
  canAct: boolean;
  onDuplicate: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  if (!props.open) return null;
  return (
    <div className="doors-workbench-action-menu">
      <button type="button" disabled={!props.canAct} onClick={props.onDuplicate}>
        <IconCopy />
        Дублировать позицию
      </button>
      <button type="button" disabled={!props.canAct} onClick={props.onReset}>
        <IconReset />
        Сбросить изменения
      </button>
      <button type="button" className="doors-workbench-action-menu-danger" disabled={!props.canAct} onClick={props.onDelete}>
        <IconTrash />
        Удалить позицию
      </button>
    </div>
  );
}

const quickKitItems = [
  { category: "frame", label: "Коробка" },
  { category: "architrave", label: "Наличники" },
  { category: "hinge", label: "Петли" },
  { category: "handle", label: "Ручка" },
  { category: "lock", label: "Замок" },
];

export function DoorKitPills(
  props: Pick<
    DoorsStageReadyProps,
    "selectedDoor" | "setProjectDoorComponentState" | "startDoorComponentEdit"
  >,
) {
  const components = props.selectedDoor?.components ?? [];
  return (
    <div className="doors-workbench-kit-pills">
      {quickKitItems.map((item) => {
        const component = components.find((current) => current.category_code === item.category);
        return (
          <button
            key={item.category}
            type="button"
            className={component ? "doors-workbench-kit-pill doors-workbench-kit-pill-active" : "doors-workbench-kit-pill"}
            aria-pressed={Boolean(component)}
            onClick={() => {
              if (component) {
                props.startDoorComponentEdit(component);
                return;
              }
              props.setProjectDoorComponentState((current) => ({
                ...current,
                category_code: item.category,
                title: item.label,
                unit: "шт",
                quantity: "1",
              }));
            }}
          >
            <span>{item.label}</span>
            <span aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
