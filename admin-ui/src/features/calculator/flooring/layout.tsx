import { Button } from "./";
import { TextField } from "./";
import type { FlooringStageReadyProps } from "./";

type FlooringStageLayoutCatalogProps = Pick<
  FlooringStageReadyProps,
  "flooringLayoutState" | "setFlooringLayoutState" | "busyKey" | "submitFlooringLayout"
>;

// Секция способов укладки для flooring stage.

export function FlooringStageLayoutCatalog(props: FlooringStageLayoutCatalogProps) {
  const { flooringLayoutState, setFlooringLayoutState, busyKey, submitFlooringLayout } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Способы укладки</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="Название"
          value={flooringLayoutState.title}
          onChange={(value) => setFlooringLayoutState((current) => ({ ...current, title: value }))}
          placeholder="Например, Диагональ"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="Коэфф. к работе"
            value={flooringLayoutState.labor_multiplier}
            onChange={(value) => setFlooringLayoutState((current) => ({ ...current, labor_multiplier: value }))}
          />
          <TextField
            label="Доп. запас, %"
            value={flooringLayoutState.extra_waste_percent}
            onChange={(value) => setFlooringLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
          />
        </div>
        <TextField
          label="Примечание"
          value={flooringLayoutState.note}
          onChange={(value) => setFlooringLayoutState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-flooring-layout-create"}
          onClick={() => void submitFlooringLayout()}
        >
          {busyKey === "calculator-flooring-layout-create" ? "Сохраняю..." : "Добавить укладку"}
        </Button>
      </div>
    </details>
  );
}
