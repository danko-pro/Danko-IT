import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

type FlooringStagePreparationCatalogProps = Pick<
  FlooringStageReadyProps,
  "flooringPreparationState" | "setFlooringPreparationState" | "busyKey" | "submitFlooringPreparation"
>;

// Секция подготовки основания для flooring stage.

export function FlooringStagePreparationCatalog(props: FlooringStagePreparationCatalogProps) {
  const { flooringPreparationState, setFlooringPreparationState, busyKey, submitFlooringPreparation } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">РџРѕРґРіРѕС‚РѕРІРєР° РѕСЃРЅРѕРІР°РЅРёСЏ</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="РќР°Р·РІР°РЅРёРµ"
          value={flooringPreparationState.title}
          onChange={(value) => setFlooringPreparationState((current) => ({ ...current, title: value }))}
          placeholder="РќР°РїСЂРёРјРµСЂ, РќР°Р»РёРІРЅРѕР№ РїРѕР»"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="Р Р°Р±РѕС‚Р°, в‚Ѕ/РјВІ"
            value={flooringPreparationState.labor_price_per_m2}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="РњР°С‚РµСЂРёР°Р», в‚Ѕ/РјВІ"
            value={flooringPreparationState.material_price_per_m2}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, material_price_per_m2: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: СЂР°СЃС…РѕРґ"
            value={flooringPreparationState.primer_consumption_per_m2}
            onChange={(value) =>
              setFlooringPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
            }
          />
          <TextField
            label="Р“СЂСѓРЅС‚: С†РµРЅР°"
            value={flooringPreparationState.primer_price_per_unit}
            onChange={(value) => setFlooringPreparationState((current) => ({ ...current, primer_price_per_unit: value }))}
          />
        </div>
        <TextField
          label="РџСЂРёРјРµС‡Р°РЅРёРµ"
          value={flooringPreparationState.note}
          onChange={(value) => setFlooringPreparationState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-flooring-preparation-create"}
          onClick={() => void submitFlooringPreparation()}
        >
          {busyKey === "calculator-flooring-preparation-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ РїРѕРґРіРѕС‚РѕРІРєСѓ"}
        </Button>
      </div>
    </details>
  );
}
