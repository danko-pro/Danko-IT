import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  SelectField,
  TextField,
  doorComponentCategoryOptions,
  getDoorComponentCategoryLabel,
  trimFloat,
} from "./calculator-shared";
import type {
  CalculatorProjectDetail,
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorCreateState,
} from "./calculator";

type DoorsCatalogPanelProps = {
  projectDetail: CalculatorProjectDetail;
  doorCatalogState: DoorCatalogCreateState;
  setDoorCatalogState: Dispatch<SetStateAction<DoorCatalogCreateState>>;
  doorComponentCatalogState: DoorComponentCatalogCreateState;
  setDoorComponentCatalogState: Dispatch<SetStateAction<DoorComponentCatalogCreateState>>;
  projectDoorState: ProjectDoorCreateState;
  setProjectDoorState: Dispatch<SetStateAction<ProjectDoorCreateState>>;
  editingDoorId: number | null;
  busyKey: string | null;
  handleDoorCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleDoorComponentCatalogSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  handleProjectDoorSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  resetDoorForm: () => void;
};

// Верхний блок дверей: каталоги и форма добавления двери/проёма в проект.
export function DoorsCatalogPanel(props: DoorsCatalogPanelProps) {
  return (
    <>
      <details className="subpanel p-3 details-panel">
        <summary className="details-summary">Каталог типоразмеров двери</summary>
        <form className="mt-3 space-y-2" onSubmit={(event) => void props.handleDoorCatalogSubmit(event)}>
          <div className="grid gap-2 md:grid-cols-4">
            <TextField
              label="Название"
              value={props.doorCatalogState.title}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, title: value }))}
              placeholder="2000x800x40"
            />
            <TextField
              label="Ширина, мм"
              value={props.doorCatalogState.width_mm}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, width_mm: value }))}
            />
            <TextField
              label="Высота, мм"
              value={props.doorCatalogState.height_mm}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, height_mm: value }))}
            />
            <TextField
              label="Толщина, мм"
              value={props.doorCatalogState.thickness_mm}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, thickness_mm: value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <TextField
              label="Закуп, ₽"
              value={props.doorCatalogState.purchase_price}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, purchase_price: value }))}
            />
            <TextField
              label="Продажа за дверь, ₽"
              value={props.doorCatalogState.sale_price}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, sale_price: value }))}
            />
            <TextField
              label="Монтаж, ₽"
              value={props.doorCatalogState.install_price}
              onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, install_price: value }))}
            />
          </div>
          <TextField
            label="Примечание"
            value={props.doorCatalogState.note}
            onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, note: value }))}
            placeholder="Например, полотно под окраску"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {props.projectDetail.door_catalog.slice(0, 6).map((item) => (
                <span key={item.id} className="stat-chip">
                  {item.title}
                </span>
              ))}
            </div>
            <button type="submit" className="action-button" disabled={props.busyKey === "calculator-door-catalog-create"}>
              {props.busyKey === "calculator-door-catalog-create" ? "Сохраняю..." : "Добавить размер"}
            </button>
          </div>
        </form>
      </details>

      <details className="subpanel p-3 details-panel">
        <summary className="details-summary">Каталог комплектующих</summary>
        <form className="mt-3 space-y-2" onSubmit={(event) => void props.handleDoorComponentCatalogSubmit(event)}>
          <div className="grid gap-2 md:grid-cols-3">
            <SelectField
              label="Категория"
              value={props.doorComponentCatalogState.category_code}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, category_code: value }))}
              options={doorComponentCategoryOptions}
            />
            <TextField
              label="Название"
              value={props.doorComponentCatalogState.title}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, title: value }))}
              placeholder="Например, Morelli MH-01"
            />
            <TextField
              label="Ед. изм."
              value={props.doorComponentCatalogState.unit}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, unit: value }))}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <TextField
              label="Закуп за ед., ₽"
              value={props.doorComponentCatalogState.purchase_price}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, purchase_price: value }))}
            />
            <TextField
              label="Продажа за ед., ₽"
              value={props.doorComponentCatalogState.sale_price}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, sale_price: value }))}
            />
            <TextField
              label="Примечание"
              value={props.doorComponentCatalogState.note}
              onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, note: value }))}
              placeholder="Например, сторона / цвет / серия"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {props.projectDetail.door_component_catalog.slice(0, 8).map((item) => (
                <span key={item.id} className="stat-chip">
                  {getDoorComponentCategoryLabel(item.category_code)} · {item.title}
                </span>
              ))}
            </div>
            <button
              type="submit"
              className="action-button"
              disabled={props.busyKey === "calculator-door-component-catalog-create"}
            >
              {props.busyKey === "calculator-door-component-catalog-create" ? "Сохраняю..." : "Добавить в каталог"}
            </button>
          </div>
        </form>
      </details>

      <form className="subpanel p-3 space-y-2" onSubmit={(event) => void props.handleProjectDoorSubmit(event)}>
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Добавить дверь или проем</div>
        <div className="grid gap-2 md:grid-cols-3">
          <SelectField
            label="Типовой размер"
            value={props.projectDoorState.door_catalog_id}
            onChange={(value) => {
              const selected = props.projectDetail.door_catalog.find((item) => String(item.id) === value);
              props.setProjectDoorState((current) => ({
                ...current,
                door_catalog_id: value,
                title: selected?.title ?? current.title,
                width_mm: selected ? trimFloat(selected.width_mm) : current.width_mm,
                height_mm: selected ? trimFloat(selected.height_mm) : current.height_mm,
                thickness_mm:
                  selected?.thickness_mm !== null && selected?.thickness_mm !== undefined
                    ? trimFloat(selected.thickness_mm)
                    : current.thickness_mm,
                purchase_price:
                  selected?.purchase_price !== null && selected?.purchase_price !== undefined
                    ? trimFloat(selected.purchase_price)
                    : current.purchase_price,
                sale_price:
                  selected?.sale_price !== null && selected?.sale_price !== undefined
                    ? trimFloat(selected.sale_price)
                    : current.sale_price,
                install_price:
                  selected?.install_price !== null && selected?.install_price !== undefined
                    ? trimFloat(selected.install_price)
                    : current.install_price,
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
            value={props.projectDoorState.opening_kind}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, opening_kind: value }))}
            options={[
              { value: "door", label: "Дверь" },
              { value: "opening", label: "Проем без двери" },
              { value: "trim_only", label: "Проем с доборами/наличниками" },
            ]}
          />
          <TextField
            label="Название"
            value={props.projectDoorState.title}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, title: value }))}
            placeholder="Если нужно своё название"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          <TextField
            label="Ширина, мм"
            value={props.projectDoorState.width_mm}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, width_mm: value }))}
          />
          <TextField
            label="Высота, мм"
            value={props.projectDoorState.height_mm}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, height_mm: value }))}
          />
          <TextField
            label="Толщина, мм"
            value={props.projectDoorState.thickness_mm}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, thickness_mm: value }))}
          />
          <SelectField
            label="Помещение A"
            value={props.projectDoorState.room_a_id}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_a_id: value }))}
            options={[
              { value: "", label: "Не выбрано" },
              ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name })),
            ]}
          />
          <SelectField
            label="Помещение B"
            value={props.projectDoorState.room_b_id}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, room_b_id: value }))}
            options={[
              { value: "", label: "Нет второй стороны" },
              ...props.projectDetail.rooms.map((room) => ({ value: String(room.id), label: room.name })),
            ]}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="Закуп, ₽"
            value={props.projectDoorState.purchase_price}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, purchase_price: value }))}
          />
          <TextField
            label="Продажа за дверь, ₽"
            value={props.projectDoorState.sale_price}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, sale_price: value }))}
          />
          <TextField
            label="Монтаж, ₽"
            value={props.projectDoorState.install_price}
            onChange={(value) => props.setProjectDoorState((current) => ({ ...current, install_price: value }))}
          />
        </div>

        <TextField
          label="Примечание"
          value={props.projectDoorState.note}
          onChange={(value) => props.setProjectDoorState((current) => ({ ...current, note: value }))}
          placeholder="Например, проем без полотна, только доборы"
        />
        <div className="flex flex-wrap justify-end gap-2">
          {props.editingDoorId !== null ? (
            <button type="button" className="secondary-button" onClick={props.resetDoorForm}>
              Сбросить
            </button>
          ) : null}
          <button
            type="submit"
            className="action-button"
            disabled={
              props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}` ||
              (props.editingDoorId !== null && props.busyKey === `calculator-project-door-save-${props.editingDoorId}`)
            }
          >
            {props.editingDoorId !== null
              ? props.busyKey === `calculator-project-door-save-${props.editingDoorId}`
                ? "Сохраняю..."
                : "Сохранить дверь"
              : props.busyKey === `calculator-project-door-create-${props.projectDetail.project.id}`
                ? "Добавляю..."
                : "Добавить в проект"}
          </button>
        </div>
      </form>
    </>
  );
}
