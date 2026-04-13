import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  MetricChip,
  SelectField,
  TextField,
  doorComponentCategoryOptions,
  formatMoney,
  getDoorComponentCategoryLabel,
  getDoorDisplayTitle,
  getDoorKindLabel,
  trimFloat,
} from "./calculator-shared";
import type {
  CalculatorDoorSpecItem,
  CalculatorDoorsSummary,
  CalculatorProjectDetail,
  CalculatorProjectDoor,
  CalculatorProjectDoorComponent,
  ProjectDoorComponentState,
} from "./calculator";

type DoorsProjectPanelProps = {
  projectDetail: CalculatorProjectDetail;
  projectDoorComponentState: ProjectDoorComponentState;
  setProjectDoorComponentState: Dispatch<SetStateAction<ProjectDoorComponentState>>;
  selectedDoorId: number | null;
  setSelectedDoorId: Dispatch<SetStateAction<number | null>>;
  editingDoorComponentId: number | null;
  selectedDoor: CalculatorProjectDoor | null;
  doorsStageSummary: CalculatorDoorsSummary;
  doorsStageSpecification: CalculatorDoorSpecItem[];
  busyKey: string | null;
  handleProjectDoorComponentSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  startDoorEdit: (door: CalculatorProjectDoor) => void;
  startDoorComponentEdit: (component: CalculatorProjectDoorComponent) => void;
  resetDoorComponentForm: () => void;
  onDeleteProjectDoor: (doorId: number) => Promise<void> | void;
  onDeleteProjectDoorComponent: (componentId: number) => Promise<void> | void;
};

// Нижний блок дверей: список дверей проекта, сводка и комплектация выбранной двери.
export function DoorsProjectPanel(props: DoorsProjectPanelProps) {
  return (
    <>
      <div className="section-separator">
        <span>Двери проекта</span>
      </div>

      <div className="space-y-2">
        {props.projectDetail.doors.map((door) => (
          <div key={door.id} className={props.selectedDoor?.id === door.id ? "dense-row dense-row-active" : "dense-row"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => props.setSelectedDoorId(door.id)}>
                <div className="text-sm font-semibold text-slate-100">{getDoorDisplayTitle(door)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">{getDoorKindLabel(door.opening_kind)}</span>
                  {door.area_m2 ? <span className="stat-chip">{trimFloat(door.area_m2)} м²</span> : null}
                  <span className="stat-chip">
                    {door.room_a_name ?? "—"} ↔ {door.room_b_name ?? "—"}
                  </span>
                  <span className="stat-chip">Комплект {formatMoney(door.components_sale_total ?? 0)}</span>
                  <span className="stat-chip">Итог {formatMoney(door.effective_sale_price ?? 0)}</span>
                  {door.effective_install_price ? (
                    <span className="stat-chip">Монтаж {formatMoney(door.effective_install_price)}</span>
                  ) : null}
                </div>
                {door.note ? <div className="mt-1 text-[12px] text-slate-500">{door.note}</div> : null}
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="micro-action" onClick={() => props.startDoorEdit(door)}>
                  Редактировать
                </button>
                <button
                  type="button"
                  className="micro-action micro-action-danger"
                  disabled={props.busyKey === `calculator-project-door-delete-${door.id}`}
                  onClick={() => void props.onDeleteProjectDoor(door.id)}
                >
                  {props.busyKey === `calculator-project-door-delete-${door.id}` ? "..." : "Удалить"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {!props.projectDetail.doors.length ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Пока нет дверей и проемов для этого проекта.
          </div>
        ) : null}
      </div>

      <div className="section-separator">
        <span>Свод и спецификация</span>
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <MetricChip label="Позиций" value={String(props.doorsStageSummary.total_items)} />
          <MetricChip label="Дверей" value={String(props.doorsStageSummary.door_units)} />
          <MetricChip label="Проёмов" value={String(props.doorsStageSummary.opening_units)} />
          <MetricChip label="Оформл. проёмов" value={String(props.doorsStageSummary.trim_only_units)} />
          <MetricChip label="Закуп" value={formatMoney(props.doorsStageSummary.purchase_total)} />
          <MetricChip label="Продажа" value={formatMoney(props.doorsStageSummary.sale_total)} />
          <MetricChip label="Монтаж" value={formatMoney(props.doorsStageSummary.install_total)} />
          <MetricChip label="Итого" value={formatMoney(props.doorsStageSummary.grand_total)} />
          <MetricChip label="Маржа" value={formatMoney(props.doorsStageSummary.margin_total)} />
        </div>

        <div className="subpanel p-3 space-y-2">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Свод комплектации дверей</div>
          <div className="grid gap-2 md:grid-cols-2">
            <MetricChip label="Комплект: закуп" value={formatMoney(props.doorsStageSummary.components_purchase_total)} />
            <MetricChip label="Комплект: продажа" value={formatMoney(props.doorsStageSummary.components_sale_total)} />
          </div>
        </div>

        <div className="subpanel p-3 space-y-2">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация по дверям</div>
          {props.doorsStageSpecification.length ? (
            <div className="space-y-2">
              {props.doorsStageSpecification.map((item, index) => (
                <div key={`${item.kind}-${item.title}-${index}`} className="dense-row">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                        <span className="stat-chip">{item.kind === "work" ? "Работы" : "Материалы"}</span>
                        <span className="stat-chip">
                          {trimFloat(item.quantity)} {item.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-100">{formatMoney(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
              Пока нет дверей или проёмов для сметной спецификации.
            </div>
          )}
        </div>
      </div>

      <div className="section-separator">
        <span>Комплектация и цены</span>
      </div>

      <div className="subpanel p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Комплектация двери</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {props.selectedDoor ? getDoorDisplayTitle(props.selectedDoor) : "Выберите дверь слева"}
            </div>
            {props.selectedDoor ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="stat-chip">Комплект закуп {formatMoney(props.selectedDoor.components_purchase_total ?? 0)}</span>
                <span className="stat-chip">Комплект продажа {formatMoney(props.selectedDoor.components_sale_total ?? 0)}</span>
                <span className="stat-chip">Итог закуп {formatMoney(props.selectedDoor.effective_purchase_price ?? 0)}</span>
                <span className="stat-chip">Итог продажа {formatMoney(props.selectedDoor.effective_sale_price ?? 0)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {props.selectedDoor ? (
          <>
            <div className="text-[12px] text-slate-500">
              Если у двери заполнена ручная цена, в итог идёт она. Если ручная цена пустая, сумма собирается из комплектующих.
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
                      label: `${getDoorComponentCategoryLabel(item.category_code)} • ${item.title}`,
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
                  placeholder="Например, 2 стороны"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {props.editingDoorComponentId !== null ? (
                  <button type="button" className="secondary-button" onClick={props.resetDoorComponentForm}>
                    Сбросить
                  </button>
                ) : null}
                <button
                  type="submit"
                  className="action-button"
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
                      : "Добавить комплектующую"}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {(props.selectedDoor.components ?? []).map((component) => (
                <div key={component.id} className="dense-row">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-100">{component.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                        <span className="stat-chip">{getDoorComponentCategoryLabel(component.category_code)}</span>
                        <span className="stat-chip">
                          {trimFloat(component.quantity)} {component.unit}
                        </span>
                        <span className="stat-chip">Закуп {formatMoney(component.purchase_total ?? 0)}</span>
                        <span className="stat-chip">Продажа {formatMoney(component.sale_total ?? 0)}</span>
                      </div>
                      {component.note ? <div className="mt-1 text-[12px] text-slate-500">{component.note}</div> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="micro-action" onClick={() => props.startDoorComponentEdit(component)}>
                        Редактировать
                      </button>
                      <button
                        type="button"
                        className="micro-action micro-action-danger"
                        disabled={props.busyKey === `calculator-project-door-component-delete-${component.id}`}
                        onClick={() => void props.onDeleteProjectDoorComponent(component.id)}
                      >
                        {props.busyKey === `calculator-project-door-component-delete-${component.id}` ? "..." : "Удалить"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!(props.selectedDoor.components ?? []).length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  Для этой двери пока нет комплектующих. Можно оставить цену одной суммой или собрать её по составу.
                </div>
              ) : null}
            </div>
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
