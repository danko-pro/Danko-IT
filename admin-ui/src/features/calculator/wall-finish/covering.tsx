import { Button } from "./";
import { TextField } from "./";
import type { WallFinishStageReadyProps } from "./";

type WallFinishStageCoveringCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishCoveringState" | "setWallFinishCoveringState" | "busyKey" | "submitWallFinishCovering"
>;

// Секция каталога отделок стен.
// Изолирует параметры финишного покрытия и его расходники.

export function WallFinishStageCoveringCatalog(props: WallFinishStageCoveringCatalogProps) {
  const { wallFinishCoveringState, setWallFinishCoveringState, busyKey, submitWallFinishCovering } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Справочник отделок стен</summary>
      <div className="mt-3 space-y-2">
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Название"
            value={wallFinishCoveringState.title}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, title: value }))}
            placeholder="Например, Обои флизелиновые"
          />
          <TextField
            label="Материал, ₽/м²"
            value={wallFinishCoveringState.material_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, material_price_per_m2: value }))}
          />
          <TextField
            label="Работа, ₽/м²"
            value={wallFinishCoveringState.labor_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="Базовый запас, %"
            value={wallFinishCoveringState.base_waste_percent}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, base_waste_percent: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Клей: расход"
            value={wallFinishCoveringState.glue_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_consumption_per_m2: value }))}
          />
          <TextField
            label="Клей: ед."
            value={wallFinishCoveringState.glue_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_unit: value }))}
          />
          <TextField
            label="Клей: цена"
            value={wallFinishCoveringState.glue_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_price_per_unit: value }))}
          />
          <TextField
            label="РРЅСЃС‚СЂСѓРјРµРЅС‚, ₽/м²"
            value={wallFinishCoveringState.instrument_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, instrument_price_per_m2: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Грунт: расход"
            value={wallFinishCoveringState.primer_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_consumption_per_m2: value }))}
          />
          <TextField
            label="Грунт: ед."
            value={wallFinishCoveringState.primer_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_unit: value }))}
          />
          <TextField
            label="Грунт: цена"
            value={wallFinishCoveringState.primer_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_price_per_unit: value }))}
          />
          <TextField
            label="Шпаклёвка: расход"
            value={wallFinishCoveringState.putty_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_consumption_per_m2: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Шпаклёвка: ед."
            value={wallFinishCoveringState.putty_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_unit: value }))}
          />
          <TextField
            label="Шпаклёвка: цена"
            value={wallFinishCoveringState.putty_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_price_per_unit: value }))}
          />
          <TextField
            label="Сетка: расход"
            value={wallFinishCoveringState.mesh_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_consumption_per_m2: value }))}
          />
          <TextField
            label="Сетка: ед."
            value={wallFinishCoveringState.mesh_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_unit: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="Сетка: цена"
            value={wallFinishCoveringState.mesh_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_price_per_unit: value }))}
          />
          <TextField
            label="Примечание"
            value={wallFinishCoveringState.note}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, note: value }))}
            placeholder="Короткое описание технологии"
          />
        </div>
        <Button
          type="button"
          disabled={busyKey === "calculator-wall-finish-covering-create"}
          onClick={() => void submitWallFinishCovering()}
        >
          {busyKey === "calculator-wall-finish-covering-create" ? "Сохраняю..." : "Добавить отделку"}
        </Button>
      </div>
    </details>
  );
}
