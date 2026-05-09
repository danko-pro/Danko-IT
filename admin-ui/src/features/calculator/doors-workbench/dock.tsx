import { useState } from "react";

import { Button } from "../../../shared/controls";
import {
  CalculatorSpecificationSheet,
  SelectField,
  TextField,
  doorComponentCategoryOptions,
  formatMoney,
} from "../shared";
import type { DoorsStageReadyProps } from "../doors/types";
import { specificationTotal } from "./helpers";

type DockMode = "summary" | "sizes" | "parts";

type DoorWorkbenchDockProps = Pick<
  DoorsStageReadyProps,
  | "projectDetail"
  | "doorsStageSummary"
  | "doorsStageSpecification"
  | "doorCatalogState"
  | "setDoorCatalogState"
  | "doorComponentCatalogState"
  | "setDoorComponentCatalogState"
  | "busyKey"
  | "handleDoorCatalogSubmit"
  | "handleDoorComponentCatalogSubmit"
>;

export function DoorWorkbenchDock(props: DoorWorkbenchDockProps) {
  const [mode, setMode] = useState<DockMode>("summary");
  return (
    <aside className="doors-workbench-panel doors-workbench-dock" data-testid="doors-workbench-dock">
      <div className="doors-workbench-dock-tabs">
        <DockButton active={mode === "summary"} onClick={() => setMode("summary")}>Итог</DockButton>
        <DockButton active={mode === "sizes"} onClick={() => setMode("sizes")}>Размеры</DockButton>
        <DockButton active={mode === "parts"} onClick={() => setMode("parts")}>Каталог</DockButton>
      </div>
      {mode === "summary" ? <DoorWorkbenchSummary {...props} /> : null}
      {mode === "sizes" ? <DoorCatalogForm {...props} /> : null}
      {mode === "parts" ? <ComponentCatalogForm {...props} /> : null}
    </aside>
  );
}

function DockButton(props: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={props.active ? "doors-workbench-dock-tab doors-workbench-dock-tab-active" : "doors-workbench-dock-tab"}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function DoorWorkbenchSummary(props: DoorWorkbenchDockProps) {
  const summary = props.doorsStageSummary;
  return (
    <div className="doors-workbench-dock-content">
      <div className="doors-workbench-summary-total">
        <span>Двери и монтаж</span>
        <strong>{formatMoney(summary.grand_total)}</strong>
      </div>
      <div className="doors-workbench-summary-grid">
        <SummaryCell label="Позиций" value={String(summary.total_items)} />
        <SummaryCell label="Дверей" value={String(summary.door_units)} />
        <SummaryCell label="Проёмов" value={String(summary.opening_units + summary.trim_only_units)} />
        <SummaryCell label="Закуп" value={formatMoney(summary.purchase_total)} />
        <SummaryCell label="Продажа" value={formatMoney(summary.sale_total)} />
        <SummaryCell label="Монтаж" value={formatMoney(summary.install_total)} />
        <SummaryCell label="Комплект закуп" value={formatMoney(summary.components_purchase_total)} />
        <SummaryCell label="Маржа" value={formatMoney(summary.margin_total)} />
      </div>
      <CalculatorSpecificationSheet
        title={`Ведомость · ${formatMoney(specificationTotal(props.doorsStageSpecification))}`}
        items={props.doorsStageSpecification}
        emptyText="Пока нет дверей для ведомости."
      />
    </div>
  );
}

function SummaryCell(props: { label: string; value: string }) {
  return (
    <div className="doors-workbench-summary-cell">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function DoorCatalogForm(props: DoorWorkbenchDockProps) {
  return (
    <form className="doors-workbench-dock-content" onSubmit={(event) => void props.handleDoorCatalogSubmit(event)}>
      <div className="doors-workbench-panel-head doors-workbench-panel-head-compact">
        <div>
          <div className="doors-workbench-kicker">Каталог</div>
          <h3>Типоразмер</h3>
        </div>
      </div>
      <TextField label="Название" size="compact" value={props.doorCatalogState.title} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, title: value }))} />
      <div className="doors-workbench-field-grid doors-workbench-field-grid-three">
        <TextField label="Ширина" size="compact" value={props.doorCatalogState.width_mm} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, width_mm: value }))} />
        <TextField label="Высота" size="compact" value={props.doorCatalogState.height_mm} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, height_mm: value }))} />
        <TextField label="Толщина" size="compact" value={props.doorCatalogState.thickness_mm} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, thickness_mm: value }))} />
      </div>
      <div className="doors-workbench-field-grid doors-workbench-field-grid-three">
        <TextField label="Закуп" size="compact" value={props.doorCatalogState.purchase_price} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, purchase_price: value }))} />
        <TextField label="Продажа" size="compact" value={props.doorCatalogState.sale_price} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, sale_price: value }))} />
        <TextField label="Монтаж" size="compact" value={props.doorCatalogState.install_price} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, install_price: value }))} />
      </div>
      <TextField label="Заметка" size="compact" value={props.doorCatalogState.note} onChange={(value) => props.setDoorCatalogState((current) => ({ ...current, note: value }))} />
      <Button type="submit" disabled={props.busyKey === "calculator-door-catalog-create"}>
        {props.busyKey === "calculator-door-catalog-create" ? "Сохраняю..." : "Добавить размер"}
      </Button>
    </form>
  );
}

function ComponentCatalogForm(props: DoorWorkbenchDockProps) {
  return (
    <form className="doors-workbench-dock-content" onSubmit={(event) => void props.handleDoorComponentCatalogSubmit(event)}>
      <div className="doors-workbench-panel-head doors-workbench-panel-head-compact">
        <div>
          <div className="doors-workbench-kicker">Каталог</div>
          <h3>Комплектующая</h3>
        </div>
      </div>
      <SelectField label="Категория" size="compact" value={props.doorComponentCatalogState.category_code} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, category_code: value }))} options={doorComponentCategoryOptions} />
      <TextField label="Название" size="compact" value={props.doorComponentCatalogState.title} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, title: value }))} />
      <div className="doors-workbench-field-grid doors-workbench-field-grid-three">
        <TextField label="Ед." size="compact" value={props.doorComponentCatalogState.unit} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, unit: value }))} />
        <TextField label="Закуп" size="compact" value={props.doorComponentCatalogState.purchase_price} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, purchase_price: value }))} />
        <TextField label="Продажа" size="compact" value={props.doorComponentCatalogState.sale_price} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, sale_price: value }))} />
      </div>
      <TextField label="Заметка" size="compact" value={props.doorComponentCatalogState.note} onChange={(value) => props.setDoorComponentCatalogState((current) => ({ ...current, note: value }))} />
      <Button type="submit" disabled={props.busyKey === "calculator-door-component-catalog-create"}>
        {props.busyKey === "calculator-door-component-catalog-create" ? "Сохраняю..." : "Добавить комплект"}
      </Button>
    </form>
  );
}
