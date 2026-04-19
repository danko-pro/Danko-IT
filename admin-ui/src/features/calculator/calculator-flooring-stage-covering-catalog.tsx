import { Button } from "../../shared/controls";
import { SelectField, TextField, underlayModeOptions } from "./calculator-shared";
import type { FlooringStageReadyProps } from "./calculator-flooring-stage-types";

type FlooringStageCoveringCatalogProps = Pick<
  FlooringStageReadyProps,
  | "flooringDetail"
  | "flooringCoveringState"
  | "setFlooringCoveringState"
  | "busyKey"
  | "submitFlooringCovering"
>;

// Секция каталога напольных покрытий.
// Здесь редактируется сам материал покрытия и его расходники без примесей подготовки и layout-настроек.

export function FlooringStageCoveringCatalog(props: FlooringStageCoveringCatalogProps) {
  const { flooringDetail, flooringCoveringState, setFlooringCoveringState, busyKey, submitFlooringCovering } = props;

  return (
    <details className="subpanel p-3 details-panel">
      <summary className="details-summary">РЎРїСЂР°РІРѕС‡РЅРёРє РїРѕРєСЂС‹С‚РёР№</summary>
      <div className="mt-3 space-y-2">
        <div className="grid gap-2 md:grid-cols-4">
          <TextField
            label="РќР°Р·РІР°РЅРёРµ"
            value={flooringCoveringState.title}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, title: value }))}
            placeholder="РќР°РїСЂРёРјРµСЂ, Р›Р°РјРёРЅР°С‚ 33 РєР»."
          />
          <TextField
            label="РњР°С‚РµСЂРёР°Р», в‚Ѕ/РјВІ"
            value={flooringCoveringState.material_price_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, material_price_per_m2: value }))}
          />
          <TextField
            label="Р Р°Р±РѕС‚Р°, в‚Ѕ/РјВІ"
            value={flooringCoveringState.labor_price_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, labor_price_per_m2: value }))}
          />
          <TextField
            label="Р‘Р°Р·РѕРІС‹Р№ Р·Р°РїР°СЃ, %"
            value={flooringCoveringState.base_waste_percent}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, base_waste_percent: value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <SelectField
            label="РџРѕРґР»РѕР¶РєР°"
            value={flooringCoveringState.underlay_mode}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, underlay_mode: value }))}
            options={underlayModeOptions}
          />
          <TextField
            label="Р Р°СЃС…РѕРґ РїРѕРґР»РѕР¶РєРё"
            value={flooringCoveringState.underlay_consumption_per_m2}
            onChange={(value) =>
              setFlooringCoveringState((current) => ({ ...current, underlay_consumption_per_m2: value }))
            }
          />
          <TextField
            label="РРЅСЃС‚СЂСѓРјРµРЅС‚, в‚Ѕ/РјВІ"
            value={flooringCoveringState.instrument_price_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, instrument_price_per_m2: value }))}
          />
          <label className="subpanel flex items-center gap-3 px-3 py-3">
            <input
              type="checkbox"
              checked={flooringCoveringState.needs_plinth}
              onChange={(event) =>
                setFlooringCoveringState((current) => ({ ...current, needs_plinth: event.target.checked }))
              }
            />
            <div>
              <div className="text-sm font-semibold text-slate-100">РЎС‡РёС‚Р°С‚СЊ РїР»РёРЅС‚СѓСЃ</div>
              <div className="mt-0.5 text-[12px] text-slate-400">РћС‚РєР»СЋС‡Р°Р№С‚Рµ РґР»СЏ РїР»РёС‚РєРё Рё Р·РѕРЅ Р±РµР· РїР»РёРЅС‚СѓСЃР°</div>
            </div>
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <TextField
            label="РљР»РµР№: СЂР°СЃС…РѕРґ"
            value={flooringCoveringState.glue_consumption_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, glue_consumption_per_m2: value }))}
          />
          <TextField
            label="РљР»РµР№: РµРґ."
            value={flooringCoveringState.glue_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, glue_unit: value }))}
          />
          <TextField
            label="РљР»РµР№: С†РµРЅР°"
            value={flooringCoveringState.glue_price_per_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, glue_price_per_unit: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: СЂР°СЃС…РѕРґ"
            value={flooringCoveringState.primer_consumption_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, primer_consumption_per_m2: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: РµРґ."
            value={flooringCoveringState.primer_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, primer_unit: value }))}
          />
          <TextField
            label="Р“СЂСѓРЅС‚: С†РµРЅР°"
            value={flooringCoveringState.primer_price_per_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, primer_price_per_unit: value }))}
          />
          <TextField
            label="РЎР’Рџ: СЂР°СЃС…РѕРґ"
            value={flooringCoveringState.svp_consumption_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, svp_consumption_per_m2: value }))}
          />
          <TextField
            label="РЎР’Рџ: РµРґ."
            value={flooringCoveringState.svp_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, svp_unit: value }))}
          />
          <TextField
            label="РЎР’Рџ: С†РµРЅР°"
            value={flooringCoveringState.svp_price_per_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, svp_price_per_unit: value }))}
          />
          <TextField
            label="Р—Р°С‚РёСЂРєР°: СЂР°СЃС…РѕРґ"
            value={flooringCoveringState.grout_consumption_per_m2}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, grout_consumption_per_m2: value }))}
          />
          <TextField
            label="Р—Р°С‚РёСЂРєР°: РµРґ."
            value={flooringCoveringState.grout_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, grout_unit: value }))}
          />
          <TextField
            label="Р—Р°С‚РёСЂРєР°: С†РµРЅР°"
            value={flooringCoveringState.grout_price_per_unit}
            onChange={(value) => setFlooringCoveringState((current) => ({ ...current, grout_price_per_unit: value }))}
          />
        </div>
        <TextField
          label="РџСЂРёРјРµС‡Р°РЅРёРµ"
          value={flooringCoveringState.note}
          onChange={(value) => setFlooringCoveringState((current) => ({ ...current, note: value }))}
          placeholder="РќР°РїСЂРёРјРµСЂ, РєР»РµРµРІРѕР№ РєРІР°СЂС†РІРёРЅРёР» / РїР»РёС‚РєР° 600x600"
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {flooringDetail.coverings.slice(0, 6).map((item) => (
              <span key={item.id} className="stat-chip">
                {item.title}
              </span>
            ))}
          </div>
          <Button
            type="button"
            disabled={busyKey === "calculator-flooring-covering-create"}
            onClick={() => void submitFlooringCovering()}
          >
            {busyKey === "calculator-flooring-covering-create" ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "Р”РѕР±Р°РІРёС‚СЊ РїРѕРєСЂС‹С‚РёРµ"}
          </Button>
        </div>
      </div>
    </details>
  );
}
