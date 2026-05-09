import type { ReactNode } from "react";

import { AddButton } from "../../../shared/controls";

type TechmapItem = {
  id: number;
  title: string;
};

export function WallFinishTechmapHeader<TItem extends TechmapItem>(props: {
  title: string;
  note: string;
  activeTitle: string;
  items: TItem[];
  addLabel: string;
  onSelect: (item: TItem) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flooring-techmap-form-head">
      <div>
        <strong>{props.title}</strong>
        <span>{props.note}</span>
      </div>
      <div className="flooring-techmap-chip-list">
        {props.items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.title === props.activeTitle ? "flooring-techmap-chip-active" : undefined}
            onClick={() => props.onSelect(item)}
          >
            {item.title}
          </button>
        ))}
        <AddButton
          className="flooring-techmap-chip-add"
          aria-label={props.addLabel}
          children={null}
          onClick={props.onCreate}
        />
      </div>
    </div>
  );
}

export function WallFinishTechmapStep(props: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flooring-techmap-step">
      <div className="flooring-techmap-step-head">
        <strong>{props.title}</strong>
        <span>{props.note}</span>
      </div>
      {props.children}
    </section>
  );
}
