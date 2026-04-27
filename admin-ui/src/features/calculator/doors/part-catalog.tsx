import { Button } from "./";
import {
  SelectField,
  TextField,
  doorComponentCategoryOptions,
  getDoorComponentCategoryLabel,
} from "./";
import type { DoorsCatalogPanelProps } from "./";

export function DoorsComponentCatalogPanel(props: DoorsCatalogPanelProps) {
  return (
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
            onChange={(value) =>
              props.setDoorComponentCatalogState((current) => ({ ...current, purchase_price: value }))
            }
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
                {getDoorComponentCategoryLabel(item.category_code)} В· {item.title}
              </span>
            ))}
          </div>
          <Button type="submit" disabled={props.busyKey === "calculator-door-component-catalog-create"}>
            {props.busyKey === "calculator-door-component-catalog-create" ? "Сохраняю..." : "Добавить в каталог"}
          </Button>
        </div>
      </form>
    </details>
  );
}
