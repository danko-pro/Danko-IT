import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

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
      <summary className="details-summary">РЎРїСЂР°РІРѕС‡РЅРёРє РѕС‚РґРµР»РѕРє СЃС‚РµРЅ</summary>
      <div className="mt-3 space-y-2">
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="РќР°Р·РІР°РЅРёРµ"
            value={wallFinishCoveringState.title}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, title: value }))}
            placeholder="РќР°РїСЂРёРјРµСЂ, РћР±РѕРё С„Р»РёР·РµР»РёРЅРѕРІС‹Рµ"
          />
          <TextField
            label="РњР°С‚РµСЂРёР°Р», в‚Ѕ/РјВІ"
            value={wallFinishCoveringState.material_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, material_price_per_m2: value }))}
          />
          <TextField
            label="Р Р°Р±РѕС‚Р°, в‚Ѕ/РјВІ"
            value={wallFinishCoveringState.labor_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="Р‘Р°Р·РѕРІС‹Р№ Р·Р°РїР°СЃ, %"
            value={wallFinishCoveringState.base_waste_percent}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, base_waste_percent: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="РљР»РµР№: СЂР°СЃС…РѕРґ"
            value={wallFinishCoveringState.glue_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_consumption_per_m2: value }))}
          />
          <TextField
            label="РљР»РµР№: РµРґ."
            value={wallFinishCoveringState.glue_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_unit: value }))}
          />
          <TextField
            label="РљР»РµР№: С†РµРЅР°"
            value={wallFinishCoveringState.glue_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, glue_price_per_unit: value }))}
          />
          <TextField
            label="РРЅСЃС‚СЂСѓРјРµРЅС‚, в‚Ѕ/РјВІ"
            value={wallFinishCoveringState.instrument_price_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, instrument_price_per_m2: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="Р“СЂСѓРЅС‚: СЂР°СЃС…РѕРґ"
            value={wallFinishCoveringState.primer_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_consumption_per_m2: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: РµРґ."
            value={wallFinishCoveringState.primer_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_unit: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: С†РµРЅР°"
            value={wallFinishCoveringState.primer_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, primer_price_per_unit: value }))}
          />
          <TextField
            label="РЁРїР°РєР»С‘РІРєР°: СЂР°СЃС…РѕРґ"
            value={wallFinishCoveringState.putty_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_consumption_per_m2: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="РЁРїР°РєР»С‘РІРєР°: РµРґ."
            value={wallFinishCoveringState.putty_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_unit: value }))}
          />
          <TextField
            label="РЁРїР°РєР»С‘РІРєР°: С†РµРЅР°"
            value={wallFinishCoveringState.putty_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, putty_price_per_unit: value }))}
          />
          <TextField
            label="РЎРµС‚РєР°: СЂР°СЃС…РѕРґ"
            value={wallFinishCoveringState.mesh_consumption_per_m2}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_consumption_per_m2: value }))}
          />
          <TextField
            label="РЎРµС‚РєР°: РµРґ."
            value={wallFinishCoveringState.mesh_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_unit: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="РЎРµС‚РєР°: С†РµРЅР°"
            value={wallFinishCoveringState.mesh_price_per_unit}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, mesh_price_per_unit: value }))}
          />
          <TextField
            label="РџСЂРёРјРµС‡Р°РЅРёРµ"
            value={wallFinishCoveringState.note}
            onChange={(value) => setWallFinishCoveringState((current) => ({ ...current, note: value }))}
            placeholder="РљРѕСЂРѕС‚РєРѕРµ РѕРїРёСЃР°РЅРёРµ С‚РµС…РЅРѕР»РѕРіРёРё"
          />
        </div>
        <Button
          type="button"
          disabled={busyKey === "calculator-wall-finish-covering-create"}
          onClick={() => void submitWallFinishCovering()}
        >
          {busyKey === "calculator-wall-finish-covering-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ РѕС‚РґРµР»РєСѓ"}
        </Button>
      </div>
    </details>
  );
}
