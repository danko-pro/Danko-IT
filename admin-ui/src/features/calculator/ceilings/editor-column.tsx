import { useState } from "react";

import { Button } from "../../../shared/controls";
import {
  CalculatorStageEmptyState,
  CalculatorStageSectionHeader,
  formatMoney,
  trimFloat,
} from "../shared";
import { CeilingItemForm } from "./item-form";
import type { CalculatorCeilingsDetail, CalculatorProjectCeilingItem } from "./model";
import type { ProjectCeilingItemPayload } from "./payload";
import { CeilingMoneyBreakdown, type CeilingsPanelMode } from "./summary-column";

type CeilingsEditorColumnProps = {
  projectId: number;
  ceilings: CalculatorCeilingsDetail;
  busyKey: string | null;
  setPanelMode: (mode: CeilingsPanelMode) => void;
  onCreateProjectCeilingItem: (projectId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
};

export function CeilingsEditorColumn(props: CeilingsEditorColumnProps) {
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const enabledItemsCount = props.ceilings.items.filter((item) => item.is_enabled).length;

  return (
    <section className="subpanel calculator-stage-section warmfloor-estimate-panel p-3">
      <CalculatorStageSectionHeader
        kicker="Позиции"
        title="Потолочная ведомость"
        note={`${enabledItemsCount} / ${props.ceilings.items.length} позиций включено`}
        actions={
          <Button type="button" onClick={() => setCreateFormOpen((current) => !current)}>
            {createFormOpen ? "Скрыть форму" : "Добавить позицию"}
          </Button>
        }
      />

        {createFormOpen ? (
          <div className="mt-3">
            <CeilingItemForm
              busy={props.busyKey === `calculator-ceiling-item-create-${props.projectId}`}
              projectId={props.projectId}
              rooms={props.ceilings.rooms}
              submitLabel="Создать позицию"
              surface="embedded"
              onCancel={() => setCreateFormOpen(false)}
              onSubmit={async (payload) => {
                await props.onCreateProjectCeilingItem(props.projectId, payload);
                setCreateFormOpen(false);
                props.setPanelMode("summary");
              }}
            />
          </div>
        ) : null}

        {!createFormOpen && props.ceilings.items.length === 0 ? (
          <CalculatorStageEmptyState>
            <div className="space-y-3">
              <div>Потолочные позиции пока не добавлены.</div>
              <Button type="button" onClick={() => setCreateFormOpen(true)}>
                Добавить позицию
              </Button>
            </div>
          </CalculatorStageEmptyState>
        ) : null}

      <CeilingItemsList
        busyKey={props.busyKey}
        editingItemId={editingItemId}
        items={props.ceilings.items}
        projectId={props.projectId}
        rooms={props.ceilings.rooms}
        setEditingItemId={setEditingItemId}
        onDeleteProjectCeilingItem={props.onDeleteProjectCeilingItem}
        onUpdateProjectCeilingItem={props.onUpdateProjectCeilingItem}
      />
    </section>
  );
}

function CeilingItemsList(props: {
  items: CalculatorProjectCeilingItem[];
  rooms: CalculatorCeilingsDetail["rooms"];
  projectId: number;
  editingItemId: number | null;
  busyKey: string | null;
  setEditingItemId: (itemId: number | null) => void;
  onUpdateProjectCeilingItem: (itemId: number, payload: ProjectCeilingItemPayload) => Promise<void>;
  onDeleteProjectCeilingItem: (itemId: number) => Promise<void>;
}) {
  if (!props.items.length) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="warmfloor-estimate-list">
        {props.items.map((item) => (
          <article className="warmfloor-estimate-row-shell" key={item.id}>
            <div className="warmfloor-estimate-row">
              <div className="warmfloor-estimate-main">
                <span className="warmfloor-estimate-kind">{item.category_snapshot || "Потолки"}</span>
                <span>{item.title_snapshot}</span>
              </div>
              <div className="warmfloor-estimate-meta">
                <span>
                  {trimFloat(item.quantity)} {item.unit_snapshot}
                </span>
                <span>{formatMoney(item.total)}</span>
              </div>
            </div>
            <div className="warmfloor-estimate-children">
              <CeilingMoneyBreakdown item={item} />
              {!item.is_enabled ? <span>Позиция выключена из итогов.</span> : null}
              {item.note_snapshot ? <span>{item.note_snapshot}</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => props.setEditingItemId(props.editingItemId === item.id ? null : item.id)}>
                {props.editingItemId === item.id ? "Закрыть" : "Изменить"}
              </Button>
              <Button
                disabled={props.busyKey === `calculator-ceiling-item-delete-${item.id}`}
                type="button"
                variant="secondary"
                onClick={() => void props.onDeleteProjectCeilingItem(item.id)}
              >
                Удалить
              </Button>
            </div>
            {props.editingItemId === item.id ? (
              <div className="mt-3">
                <CeilingItemForm
                  busy={props.busyKey === `calculator-ceiling-item-save-${item.id}`}
                  initialItem={item}
                  projectId={props.projectId}
                  rooms={props.rooms}
                  submitLabel="Сохранить"
                  surface="embedded"
                  onCancel={() => props.setEditingItemId(null)}
                  onSubmit={async (payload) => {
                    await props.onUpdateProjectCeilingItem(item.id, { ...payload, project_id: props.projectId });
                    props.setEditingItemId(null);
                  }}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
