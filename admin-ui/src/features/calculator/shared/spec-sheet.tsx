import { formatMoney, trimFloat } from "./";

type CalculatorSpecificationItem = {
  kind: "work" | "material";
  title: string;
  unit: string;
  quantity: number;
  amount: number;
};

type CalculatorSpecificationSheetProps = {
  items: CalculatorSpecificationItem[];
  emptyText: string;
  title?: string;
};

function getPositionWord(count: number): string {
  const remainder100 = count % 100;
  const remainder10 = count % 10;

  if (remainder100 >= 11 && remainder100 <= 19) {
    return "позиций";
  }
  if (remainder10 === 1) {
    return "позиция";
  }
  if (remainder10 >= 2 && remainder10 <= 4) {
    return "позиции";
  }
  return "позиций";
}

export function CalculatorSpecificationSheet(props: CalculatorSpecificationSheetProps) {
  const { items, emptyText, title = "Сметная ведомость" } = props;
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const summaryMeta = items.length ? `${items.length} ${getPositionWord(items.length)} · ${formatMoney(totalAmount)}` : "пусто";

  return (
    <details className="subpanel p-3 details-panel calculator-spec-sheet">
      <summary className="details-summary calculator-spec-sheet-summary">
        <span>{title}</span>
        <span className="calculator-spec-sheet-summary-meta">{summaryMeta}</span>
      </summary>

      {items.length ? (
        <div className="calculator-spec-sheet-wrap mt-3">
          <table className="calculator-spec-sheet-table">
            <colgroup>
              <col className="calculator-spec-sheet-col-title" />
              <col className="calculator-spec-sheet-col-kind" />
              <col className="calculator-spec-sheet-col-qty" />
              <col className="calculator-spec-sheet-col-unit" />
              <col className="calculator-spec-sheet-col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th>Позиция</th>
                <th>Раздел</th>
                <th>Кол-во</th>
                <th>Ед.</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.kind}-${item.title}-${index}`}>
                  <td className="calculator-spec-sheet-cell-title">{item.title}</td>
                  <td>{item.kind === "work" ? "Работы" : "Материалы"}</td>
                  <td>{trimFloat(item.quantity)}</td>
                  <td>{item.unit}</td>
                  <td className="calculator-spec-sheet-cell-amount">{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Итого по ведомости</td>
                <td className="calculator-spec-sheet-cell-amount">{formatMoney(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="calculator-spec-sheet-empty mt-3">{emptyText}</div>
      )}
    </details>
  );
}
