import { Button } from "./";
import { TextField } from "./";
import type { FlooringStageReadyProps } from "./";

type FlooringStagePreparationCatalogProps = Pick<
  FlooringStageReadyProps,
  "flooringPreparationState" | "setFlooringPreparationState" | "busyKey" | "submitFlooringPreparation"
>;

// Секция подготовки основания для flooring stage.

export function FlooringStagePreparationCatalog(props: FlooringStagePreparationCatalogProps) {
  const { flooringPreparationState, setFlooringPreparationState, busyKey, submitFlooringPreparation } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">Подготовка основания</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="Название"
          value={flooringPreparationState.title}
          onChange={(value) => setFlooringPreparationState((current) => ({ ...current, title: value }))}
          placeholder="Например, Наливной пол"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="Работа, ₽/м²"
            value={flooringPreparationState.labor_price_per_m2}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="Материал, ₽/м²"
            value={flooringPreparationState.material_price_per_m2}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, material_price_per_m2: value }))}
          />
          <TextField
            label="Грунт: расход"
            value={flooringPreparationState.primer_consumption_per_m2}
            onChange={(value) =>
              setFlooringPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
            }
          />
          <TextField
            label="Грунт: цена"
            value={flooringPreparationState.primer_price_per_unit}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, primer_price_per_unit: value }))}
          />
        </div>
        <TextField
          label="Примечание"
          value={flooringPreparationState.note}
          onChange={(value) => setFlooringPreparationState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-flooring-preparation-create"}
          onClick={() => void submitFlooringPreparation()}
        >
          {busyKey === "calculator-flooring-preparation-create" ? "Сохраняю..." : "Добавить подготовку"}
        </Button>
      </div>
    </details>
  );
}
