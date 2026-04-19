import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

type WallFinishStagePreparationCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishPreparationState" | "setWallFinishPreparationState" | "busyKey" | "submitWallFinishPreparation"
>;

// Секция подготовки стен для wall finish stage.

export function WallFinishStagePreparationCatalog(props: WallFinishStagePreparationCatalogProps) {
  const { wallFinishPreparationState, setWallFinishPreparationState, busyKey, submitWallFinishPreparation } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">РЎРїСЂР°РІРѕС‡РЅРёРє РїРѕРґРіРѕС‚РѕРІРєРё СЃС‚РµРЅ</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="РќР°Р·РІР°РЅРёРµ"
          value={wallFinishPreparationState.title}
          onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, title: value }))}
          placeholder="РќР°РїСЂРёРјРµСЂ, РЁРїР°РєР»РµРІР°РЅРёРµ РїРѕРґ РїРѕРєСЂР°СЃРєСѓ"
        />
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="Р Р°Р±РѕС‚Р°, в‚Ѕ/РјВІ"
            value={wallFinishPreparationState.labor_price_per_m2}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="РњР°С‚РµСЂРёР°Р», в‚Ѕ/РјВІ"
            value={wallFinishPreparationState.material_price_per_m2}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, material_price_per_m2: value }))
            }
          />
          <TextField
            label="Р“СЂСѓРЅС‚: СЂР°СЃС…РѕРґ"
            value={wallFinishPreparationState.primer_consumption_per_m2}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, primer_consumption_per_m2: value }))
            }
          />
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="Р“СЂСѓРЅС‚: РµРґ."
            value={wallFinishPreparationState.primer_unit}
            onChange={(value) => setWallFinishPreparationState((current) => ({ ...current, primer_unit: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: С†РµРЅР°"
            value={wallFinishPreparationState.primer_price_per_unit}
            onChange={(value) =>
              setWallFinishPreparationState((current) => ({ ...current, primer_price_per_unit: value }))
            }
          />
          <TextField
            label="РџСЂРёРјРµС‡Р°РЅРёРµ"
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
          {busyKey === "calculator-wall-finish-preparation-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ РїРѕРґРіРѕС‚РѕРІРєСѓ"}
        </Button>
      </div>
    </details>
  );
}
