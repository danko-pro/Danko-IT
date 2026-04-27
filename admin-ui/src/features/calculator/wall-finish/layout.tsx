import { Button } from "./";
import { TextField } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStageLayoutCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishLayoutState" | "setWallFinishLayoutState" | "busyKey" | "submitWallFinishLayout"
>;

// Секция способов монтажа для wall finish stage.

export function WallFinishStageLayoutCatalog(props: WallFinishStageLayoutCatalogProps) {
  const { wallFinishLayoutState, setWallFinishLayoutState, busyKey, submitWallFinishLayout } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Справочник способов монтажа</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="Название"
          value={wallFinishLayoutState.title}
          onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, title: value }))}
          placeholder="Например, С подбором рисунка"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="Коэфф. к работе"
            value={wallFinishLayoutState.labor_multiplier}
            onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, labor_multiplier: value }))}
          />
          <TextField
            label="Доп. запас, %"
            value={wallFinishLayoutState.extra_waste_percent}
            onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
          />
        </div>
        <TextField
          label="Примечание"
          value={wallFinishLayoutState.note}
          onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-wall-finish-layout-create"}
          onClick={() => void submitWallFinishLayout()}
        >
          {busyKey === "calculator-wall-finish-layout-create" ? "Сохраняю..." : "Добавить способ"}
        </Button>
      </div>
    </details>
  );
}
