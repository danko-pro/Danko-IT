import { Button } from "./";
import {
  SelectField,
  TextField,
  doorComponentCategoryOptions,
  getDoorComponentCategoryLabel,
  trimFloat,
} from "./";
import type { DoorsProjectComponentsReadyProps } from "./";

export function DoorsProjectComponentsForm(props: DoorsProjectComponentsReadyProps) {
  return (
    <>
      <div className="text-[12px] text-slate-500">
        Если у двери заполнена ручная цена, в итог пойдёт она. Если ручная цена пустая, сумма собирается из
        комплектующих.
      </div>
      <form className="space-y-2" onSubmit={(event) => void props.handleProjectDoorComponentSubmit(event)}>
        <div className="grid gap-2 md:grid-cols-4">
          <SelectField
            label="Из каталога"
            value={props.projectDoorComponentState.component_catalog_id}
            onChange={(value) => {
              const selected = props.projectDetail.door_component_catalog.find((item) => String(item.id) === value);
              props.setProjectDoorComponentState((current) => ({
                ...current,
                component_catalog_id: value,
                category_code: selected?.category_code ?? current.category_code,
                title: selected?.title ?? current.title,
                unit: selected?.unit ?? current.unit,
                purchase_price:
                  selected?.purchase_price !== null && selected?.purchase_price !== undefined
                    ? trimFloat(selected.purchase_price)
                    : current.purchase_price,
                sale_price:
                  selected?.sale_price !== null && selected?.sale_price !== undefined
                    ? trimFloat(selected.sale_price)
                    : current.sale_price,
              }));
            }}
            options={[
              { value: "", label: "Без каталога" },
              ...props.projectDetail.door_component_catalog.map((item) => ({
                value: String(item.id),
                label: `${getDoorComponentCategoryLabel(item.category_code)} · ${item.title}`,
              })),
            ]}
          />
          <SelectField
            label="Категория"
            value={props.projectDoorComponentState.category_code}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, category_code: value }))}
            options={doorComponentCategoryOptions}
          />
          <TextField
            label="Название"
            value={props.projectDoorComponentState.title}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, title: value }))}
            placeholder="Например, добор 100 мм"
          />
          <TextField
            label="Ед. изм."
            value={props.projectDoorComponentState.unit}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, unit: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Количество"
            value={props.projectDoorComponentState.quantity}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, quantity: value }))}
          />
          <TextField
            label="Закуп за ед., ₽"
            value={props.projectDoorComponentState.purchase_price}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, purchase_price: value }))}
          />
          <TextField
            label="Продажа за ед., ₽"
            value={props.projectDoorComponentState.sale_price}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, sale_price: value }))}
          />
          <TextField
            label="Примечание"
            value={props.projectDoorComponentState.note}
            onChange={(value) => props.setProjectDoorComponentState((current) => ({ ...current, note: value }))}
            placeholder="Примечание, 2 стороны"
          />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {props.editingDoorComponentId !== null ? (
            <Button type="button" variant="secondary" onClick={props.resetDoorComponentForm}>
              Сбросить
            </Button>
          ) : null}
          <Button
            type="submit"
            disabled={
              props.busyKey === `calculator-project-door-component-create-${props.selectedDoor.id}` ||
              (props.editingDoorComponentId !== null &&
                props.busyKey === `calculator-project-door-component-save-${props.editingDoorComponentId}`)
            }
          >
            {props.editingDoorComponentId !== null
              ? props.busyKey === `calculator-project-door-component-save-${props.editingDoorComponentId}`
                ? "Сохраняю..."
                : "Сохранить комплект"
              : props.busyKey === `calculator-project-door-component-create-${props.selectedDoor.id}`
                ? "Добавляю..."
                : "Добавить комплектующие"}
          </Button>
        </div>
      </form>
    </>
  );
}
