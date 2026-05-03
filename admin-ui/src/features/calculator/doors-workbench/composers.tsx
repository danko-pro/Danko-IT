import { Button } from "../../../shared/controls";
import { SelectField, TextField, doorComponentCategoryOptions, trimFloat } from "../shared";
import type { DoorsStageReadyProps } from "../doors/types";

type DoorComposerProps = Pick<
  DoorsStageReadyProps,
  | "projectDetail"
  | "projectDoorState"
  | "setProjectDoorState"
  | "editingDoorId"
  | "busyKey"
  | "handleProjectDoorSubmit"
  | "resetDoorForm"
>;

export function DoorWorkbenchDoorComposer(props: DoorComposerProps) {
  const createBusy = props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}`;
  const saveBusy = props.editingDoorId !== null && props.busyKey === `calculator-project-door-save-${props.editingDoorId}`;
  return (
    <form className="doors-workbench-composer" onSubmit={(event) => void props.handleProjectDoorSubmit(event)}>
      <div className="doors-workbench-panel-head">
        <div>
          <div className="doors-workbench-kicker">{props.editingDoorId === null ? "Новая позиция" : "Редактирование"}</div>
          <h3>{props.editingDoorId === null ? "Дверь или проем" : "Параметры выбранной позиции"}</h3>
        </div>
        {props.editingDoorId !== null ? (
          <Button type="button" variant="micro" onClick={props.resetDoorForm}>
            Сбросить
          </Button>
        ) : null}
      </div>

      <div className="doors-workbench-field-grid doors-workbench-field-grid-main">
        <SelectField
          label="Типовой размер"
          size="compact"
          value={props.projectDoorState.door_catalog_id}
          onChange={(value) => {
            const selected = props.projectDetail.door_catalog.find((item) => String(item.id) === value);
            props.setProjectDoorState((current) => ({
              ...current,
              door_catalog_id: value,
              title: selected?.title ?? current.title,
              width_mm: selected ? trimFloat(selected.width_mm) : current.width_mm,
              height_mm: selected ? trimFloat(selected.height_mm) : current.height_mm,
              thickness_mm: selected?.thickness_mm ? trimFloat(selected.thickness_mm) : current.thickness_mm,
              purchase_price: selected?.purchase_price ? trimFloat(selected.purchase_price) : current.purchase_price,
              sale_price: selected?.sale_price ? trimFloat(selected.sale_price) : current.sale_price,
              install_price: selected?.install_price ? trimFloat(selected.install_price) : current.install_price,
            }));
          }}
          options={[
            { value: "", label: "Без каталога" },
            ...props.projectDetail.door_catalog.map((item) => ({
              value: String(item.id),
              label: `${item.title} · ${trimFloat(item.area_m2)} м²`,
            })),
          ]}
        />
        <SelectField
          label="Тип"
          size="compact"
          value={props.projectDoorState.opening_kind}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, opening_kind: value }))}
          options={[
            { value: "door", label: "Дверь" },
            { value: "opening", label: "Проем" },
            { value: "trim_only", label: "Доборы / наличники" },
          ]}
        />
        <TextField
          label="Название"
          size="compact"
          value={props.projectDoorState.title}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, title: value }))}
        />
      </div>

      <div className="doors-workbench-field-grid">
        <TextField label="Ширина" size="compact" value={props.projectDoorState.width_mm} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, width_mm: value }))} />
        <TextField label="Высота" size="compact" value={props.projectDoorState.height_mm} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, height_mm: value }))} />
        <TextField label="Толщина" size="compact" value={props.projectDoorState.thickness_mm} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, thickness_mm: value }))} />
        <SelectField
          label="Помещение A"
          size="compact"
          value={props.projectDoorState.room_a_id}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_a_id: value }))}
          options={[{ value: "", label: "Не выбрано" }, ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name }))]}
        />
        <SelectField
          label="Помещение B"
          size="compact"
          value={props.projectDoorState.room_b_id}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_b_id: value }))}
          options={[{ value: "", label: "Одна сторона" }, ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name }))]}
        />
      </div>

      <div className="doors-workbench-field-grid doors-workbench-field-grid-money">
        <TextField label="Закуп" size="compact" value={props.projectDoorState.purchase_price} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, purchase_price: value }))} />
        <TextField label="Продажа" size="compact" value={props.projectDoorState.sale_price} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, sale_price: value }))} />
        <TextField label="Монтаж" size="compact" value={props.projectDoorState.install_price} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, install_price: value }))} />
        <TextField label="Заметка" size="compact" value={props.projectDoorState.note} onChange={(value) => props.setProjectDoorState((current) => ({ ...current, note: value }))} />
      </div>

      <div className="doors-workbench-actions">
        <Button type="submit" disabled={createBusy || saveBusy}>
          {props.editingDoorId === null ? (createBusy ? "Добавляю..." : "Добавить") : saveBusy ? "Сохраняю..." : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

type ComponentComposerProps = Pick<
  DoorsStageReadyProps,
  | "projectDetail"
  | "selectedDoor"
  | "projectDoorComponentState"
  | "setProjectDoorComponentState"
  | "editingDoorComponentId"
  | "busyKey"
  | "handleProjectDoorComponentSubmit"
  | "resetDoorComponentForm"
>;

export function DoorWorkbenchComponentComposer(props: ComponentComposerProps) {
  if (!props.selectedDoor) return <div className="doors-workbench-empty-panel">Выберите дверь, чтобы собрать комплект.</div>;
  const createBusy = props.busyKey === `calculator-project-door-component-create-${props.selectedDoor.id}`;
  const saveBusy =
    props.editingDoorComponentId !== null &&
    props.busyKey === `calculator-project-door-component-save-${props.editingDoorComponentId}`;
  return (
    <form className="doors-workbench-component-form" onSubmit={(event) => void props.handleProjectDoorComponentSubmit(event)}>
      <div className="doors-workbench-panel-head doors-workbench-panel-head-compact">
        <div>
          <div className="doors-workbench-kicker">Комплект</div>
          <h3>{props.editingDoorComponentId === null ? "Добавить строку" : "Редактировать строку"}</h3>
        </div>
        {props.editingDoorComponentId !== null ? (
          <Button type="button" variant="micro" onClick={props.resetDoorComponentForm}>
            Сбросить
          </Button>
        ) : null}
      </div>
      <div className="doors-workbench-field-grid doors-workbench-component-grid">
        <SelectField
          label="Каталог"
          size="compact"
          value={props.projectDoorComponentState.component_catalog_id}
          onChange={(value) => {
            const selected = props.projectDetail.door_component_catalog.find((item) => String(item.id) === value);
            props.setProjectDoorComponentState((current) => ({
              ...current,
              component_catalog_id: value,
              category_code: selected?.category_code ?? current.category_code,
              title: selected?.title ?? current.title,
              unit: selected?.unit ?? current.unit,
              purchase_price: selected?.purchase_price ? trimFloat(selected.purchase_price) : current.purchase_price,
              sale_price: selected?.sale_price ? trimFloat(selected.sale_price) : current.sale_price,
            }));
          }}
          options={[{ value: "", label: "Без каталога" }, ...props.projectDetail.door_component_catalog.map((item) => ({ value: String(item.id), label: item.title }))]}
        />
        <SelectField label="Категория" size="compact" value={props.projectDoorComponentState.category_code} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, category_code: value }))} options={doorComponentCategoryOptions} />
        <TextField label="Название" size="compact" value={props.projectDoorComponentState.title} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, title: value }))} />
        <TextField label="Кол-во" size="compact" value={props.projectDoorComponentState.quantity} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, quantity: value }))} />
        <TextField label="Ед." size="compact" value={props.projectDoorComponentState.unit} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, unit: value }))} />
        <TextField label="Закуп" size="compact" value={props.projectDoorComponentState.purchase_price} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, purchase_price: value }))} />
        <TextField label="Продажа" size="compact" value={props.projectDoorComponentState.sale_price} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, sale_price: value }))} />
        <TextField label="Заметка" size="compact" value={props.projectDoorComponentState.note} onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, note: value }))} />
      </div>
      <div className="doors-workbench-actions">
        <Button type="submit" disabled={createBusy || saveBusy}>
          {props.editingDoorComponentId === null ? (createBusy ? "Добавляю..." : "Добавить в комплект") : saveBusy ? "Сохраняю..." : "Сохранить строку"}
        </Button>
      </div>
    </form>
  );
}
