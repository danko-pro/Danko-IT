import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { WallFinishStageReadyProps } from "./calculator-wall-finish-stage-types";

type WallFinishStageLayoutCatalogProps = Pick<
  WallFinishStageReadyProps,
  "wallFinishLayoutState" | "setWallFinishLayoutState" | "busyKey" | "submitWallFinishLayout"
>;

// Секция способов монтажа для wall finish stage.

export function WallFinishStageLayoutCatalog(props: WallFinishStageLayoutCatalogProps) {
  const { wallFinishLayoutState, setWallFinishLayoutState, busyKey, submitWallFinishLayout } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">РЎРїСЂР°РІРѕС‡РЅРёРє СЃРїРѕСЃРѕР±РѕРІ РјРѕРЅС‚Р°Р¶Р°</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="РќР°Р·РІР°РЅРёРµ"
          value={wallFinishLayoutState.title}
          onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, title: value }))}
          placeholder="РќР°РїСЂРёРјРµСЂ, РЎ РїРѕРґР±РѕСЂРѕРј СЂРёСЃСѓРЅРєР°"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="РљРѕСЌС„С„. Рє СЂР°Р±РѕС‚Рµ"
            value={wallFinishLayoutState.labor_multiplier}
            onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, labor_multiplier: value }))}
          />
          <TextField
            label="Р”РѕРї. Р·Р°РїР°СЃ, %"
            value={wallFinishLayoutState.extra_waste_percent}
            onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
          />
        </div>
        <TextField
          label="РџСЂРёРјРµС‡Р°РЅРёРµ"
          value={wallFinishLayoutState.note}
          onChange={(value) => setWallFinishLayoutState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-wall-finish-layout-create"}
          onClick={() => void submitWallFinishLayout()}
        >
          {busyKey === "calculator-wall-finish-layout-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ СЃРїРѕСЃРѕР±"}
        </Button>
      </div>
    </details>
  );
}
