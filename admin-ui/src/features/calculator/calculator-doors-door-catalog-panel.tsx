import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { DoorsCatalogPanelProps } from "./calculator-doors-stage-catalog-types";

export function DoorsDoorCatalogPanel(props: DoorsCatalogPanelProps) {
  return (
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
          <Button type="submit" disabled={props.busyKey === "calculator-door-catalog-create"}>
            {props.busyKey === "calculator-door-catalog-create" ? "Сохраняю..." : "Добавить размер"}
          </Button>
        </div>
      </form>
    </details>
  );
}
