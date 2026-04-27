import { Button } from "./";
import { TextField } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStagePreparationCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishPreparationState" | "setWallFinishPreparationState" | "busyKey" | "submitWallFinishPreparation"
>;

// Секция подготовки стен для wall finish stage.

export function WallFinishStagePreparationCatalog(props: WallFinishStagePreparationCatalogProps) {
  const { wallFinishPreparationState, setWallFinishPreparationState, busyKey, submitWallFinishPreparation } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Справочник подготовки стен</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="Название"
          value={wallFinishPreparationState.title}
          onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, title: value }))}
          placeholder="Например, Шпаклевание под покраску"
        />
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="Работа, ₽/м²"
            value={wallFinishPreparationState.labor_price_per_m2}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="Материал, ₽/м²"
            value={wallFinishPreparationState.material_price_per_m2}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, material_price_per_m2: value }))
            }
          />
          <TextField
            label="Грунт: расход"
            value={wallFinishPreparationState.primer_consumption_per_m2}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
            }
          />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="Грунт: ед."
            value={wallFinishPreparationState.primer_unit}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, primer_unit: value }))}
          />
          <TextField
            label="Грунт: цена"
            value={wallFinishPreparationState.primer_price_per_unit}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, primer_price_per_unit: value }))
            }
          />
          <TextField
            label="Примечание"
            value={wallFinishPreparationState.note}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, note: value }))}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-wall-finish-preparation-create"}
          onClick={() => void submitWallFinishPreparation()}
        >
          {busyKey === "calculator-wall-finish-preparation-create" ? "Сохраняю..." : "Добавить подготовку"}
        </Button>
      </div>
    </details>
  );
}
