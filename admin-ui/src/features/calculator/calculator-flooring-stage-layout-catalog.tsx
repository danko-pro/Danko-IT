import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

type FlooringStageLayoutCatalogProps = Pick<
  FlooringStageReadyProps,
  "flooringLayoutState" | "setFlooringLayoutState" | "busyKey" | "submitFlooringLayout"
>;

// Секция способов укладки для flooring stage.

export function FlooringStageLayoutCatalog(props: FlooringStageLayoutCatalogProps) {
  const { flooringLayoutState, setFlooringLayoutState, busyKey, submitFlooringLayout } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">РЎРїРѕСЃРѕР±С‹ СѓРєР»Р°РґРєРё</summary>
      <div className="mt-3 space-y-2">
        <TextField
          label="РќР°Р·РІР°РЅРёРµ"
          value={flooringLayoutState.title}
          onChange={(value) => setFlooringLayoutState((current) => ({ ...current, title: value }))}
          placeholder="РќР°РїСЂРёРјРµСЂ, Р”РёР°РіРѕРЅР°Р»СЊ"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <TextField
            label="РљРѕСЌС„С„. Рє СЂР°Р±РѕС‚Рµ"
            value={flooringLayoutState.labor_multiplier}
            onChange={(value) => setFlooringLayoutState((current) => ({ ...current, labor_multiplier: value }))}
          />
          <TextField
            label="Р”РѕРї. Р·Р°РїР°СЃ, %"
            value={flooringLayoutState.extra_waste_percent}
            onChange={(value) => setFlooringLayoutState((current) => ({ ...current, extra_waste_percent: value }))}
          />
        </div>
        <TextField
          label="РџСЂРёРјРµС‡Р°РЅРёРµ"
          value={flooringLayoutState.note}
          onChange={(value) => setFlooringLayoutState((current) => ({ ...current, note: value }))}
        />
        <Button
          type="button"
          className="w-full"
          disabled={busyKey === "calculator-flooring-layout-create"}
          onClick={() => void submitFlooringLayout()}
        >
          {busyKey === "calculator-flooring-layout-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ СѓРєР»Р°РґРєСѓ"}
        </Button>
      </div>
    </details>
  );
}
