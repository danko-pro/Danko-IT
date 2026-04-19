import { formatMoney, getDoorDisplayTitle } from "./calculator-shared";
import type { DoorsProjectComponentsPanelProps } from "./calculator-doors-stage-project-types";

type DoorsProjectComponentsHeaderProps = Pick<DoorsProjectComponentsPanelProps, "selectedDoor">;

export function DoorsProjectComponentsHeader(props: DoorsProjectComponentsHeaderProps) {
  return (
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
  );
}
