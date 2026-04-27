import type { ProjectKpRowDraft, ProjectKpRowDraftSetter } from "./types";

function parseDraftAmount(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatDraftCurrency(value: number) {
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} ₽`;
}

type ProjectStageKpTableProps = {
  kpRows: ProjectKpRowDraft[];
  updateKpRow: ProjectKpRowDraftSetter;
};

export function ProjectStageKpTable(props: ProjectStageKpTableProps) {
  const { kpRows, updateKpRow } = props;

  return (
    <div className="calculator-project-workspace-kp-sheet">
      <div className="calculator-project-workspace-kp-table-wrap">
        <table className="calculator-project-workspace-kp-table">
          <colgroup>
            <col className="calculator-project-workspace-kp-col-title" />
            <col className="calculator-project-workspace-kp-col-unit" />
            <col className="calculator-project-workspace-kp-col-qty" />
            <col className="calculator-project-workspace-kp-col-rate" />
            <col className="calculator-project-workspace-kp-col-amount" />
            <col className="calculator-project-workspace-kp-col-rate" />
            <col className="calculator-project-workspace-kp-col-amount" />
            <col className="calculator-project-workspace-kp-col-total" />
          </colgroup>
          <thead>
            <tr>
              <th>Позиция</th>
              <th>Ед.</th>
              <th>Кол-во</th>
              <th>Работы / ед.</th>
              <th>Работы</th>
              <th>Материалы / ед.</th>
              <th>Материалы</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {kpRows.map((row) => {
              const quantity = parseDraftAmount(row.quantity);
              const workRate = parseDraftAmount(row.workRate);
              const materialRate = parseDraftAmount(row.materialRate);
              const workAmount = quantity !== null && workRate !== null ? quantity * workRate : null;
              const materialAmount = quantity !== null && materialRate !== null ? quantity * materialRate : null;
              const totalAmount =
                workAmount !== null || materialAmount !== null ? (workAmount ?? 0) + (materialAmount ?? 0) : null;

              return (
                <tr key={row.id}>
                  <td className="calculator-project-workspace-kp-cell-title">
                    <input
                      className="calculator-project-workspace-kp-input"
                      value={row.title}
                      onChange={(event) => updateKpRow(row.id, "title", event.target.value)}
                      aria-label="Позиция"
                    />
                  </td>
                  <td className="calculator-project-workspace-kp-cell-unit">
                    <input
                      className="calculator-project-workspace-kp-input"
                      value={row.unit}
                      onChange={(event) => updateKpRow(row.id, "unit", event.target.value)}
                      aria-label="Единица измерения"
                    />
                  </td>
                  <td className="calculator-project-workspace-kp-cell-number">
                    <input
                      className="calculator-project-workspace-kp-input calculator-project-workspace-kp-input-number"
                      value={row.quantity}
                      onChange={(event) => updateKpRow(row.id, "quantity", event.target.value)}
                      aria-label="Количество"
                    />
                  </td>
                  <td className="calculator-project-workspace-kp-cell-number">
                    <input
                      className="calculator-project-workspace-kp-input calculator-project-workspace-kp-input-number"
                      value={row.workRate}
                      onChange={(event) => updateKpRow(row.id, "workRate", event.target.value)}
                      aria-label="Цена за единицу работ"
                    />
                  </td>
                  <td className="calculator-project-workspace-kp-cell-amount">
                    {workAmount === null ? "—" : formatDraftCurrency(workAmount)}
                  </td>
                  <td className="calculator-project-workspace-kp-cell-number">
                    <input
                      className="calculator-project-workspace-kp-input calculator-project-workspace-kp-input-number"
                      value={row.materialRate}
                      onChange={(event) => updateKpRow(row.id, "materialRate", event.target.value)}
                      aria-label="Цена за единицу материалов"
                    />
                  </td>
                  <td className="calculator-project-workspace-kp-cell-amount">
                    {materialAmount === null ? "—" : formatDraftCurrency(materialAmount)}
                  </td>
                  <td className="calculator-project-workspace-kp-cell-amount calculator-project-workspace-kp-cell-total">
                    {totalAmount === null ? "—" : formatDraftCurrency(totalAmount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="calculator-project-workspace-kp-foot-label" colSpan={4}>
                Итого по КП
              </td>
              <td className="calculator-project-workspace-kp-foot-amount">
                {formatDraftCurrency(
                  kpRows.reduce((total, row) => {
                    const quantity = parseDraftAmount(row.quantity);
                    const workRate = parseDraftAmount(row.workRate);

                    if (quantity === null || workRate === null) {
                      return total;
                    }

                    return total + quantity * workRate;
                  }, 0),
                )}
              </td>
              <td className="calculator-project-workspace-kp-foot-spacer" />
              <td className="calculator-project-workspace-kp-foot-amount">
                {formatDraftCurrency(
                  kpRows.reduce((total, row) => {
                    const quantity = parseDraftAmount(row.quantity);
                    const materialRate = parseDraftAmount(row.materialRate);

                    if (quantity === null || materialRate === null) {
                      return total;
                    }

                    return total + quantity * materialRate;
                  }, 0),
                )}
              </td>
              <td className="calculator-project-workspace-kp-foot-amount calculator-project-workspace-kp-foot-total">
                {formatDraftCurrency(
                  kpRows.reduce((total, row) => {
                    const quantity = parseDraftAmount(row.quantity);
                    const workRate = parseDraftAmount(row.workRate);
                    const materialRate = parseDraftAmount(row.materialRate);

                    if (quantity === null) {
                      return total;
                    }

                    return total + quantity * (workRate ?? 0) + quantity * (materialRate ?? 0);
                  }, 0),
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
