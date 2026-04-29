import { formatArea, formatMeters, formatMoney, getUnderlayModeLabel, trimFloat } from "./";
import type { FlooringStageReadyProps } from "./";

type FlooringStageTechMapProps = Pick<FlooringStageReadyProps, "flooringSelectedTechRooms">;

export function FlooringStageTechMap(props: FlooringStageTechMapProps) {
  if (!props.flooringSelectedTechRooms.length) {
    return null;
  }

  return (
    <div className="subpanel calculator-stage-section p-3 space-y-3">
      <div className="calculator-stage-section-head">
        <div>
          <div className="calculator-stage-section-kicker">Техкарта</div>
          <div className="calculator-stage-section-title">Выбранные помещения и расходники</div>
        </div>
        <div className="calculator-stage-section-note">
          Краткая карта по каждой выбранной комнате: площадь, закупка, запас и сопутствующие материалы.
        </div>
      </div>

      <div className="space-y-2">
        {props.flooringSelectedTechRooms.map(({ room, covering }) => (
          <div key={room.room_id} className="dense-row">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-100">{room.room_name}</div>
                <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">{room.covering_title ?? "Покрытие"}</span>
                  {room.layout_title ? <span className="stat-chip">Укладка: {room.layout_title}</span> : null}
                  {room.preparation_title ? <span className="stat-chip">Подготовка: {room.preparation_title}</span> : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">Площадь {formatArea(room.effective_area_m2)}</span>
                  <span className="stat-chip">Закупка {formatArea(room.purchase_area_m2)}</span>
                  <span className="stat-chip">Запас {trimFloat(room.total_waste_percent)}%</span>
                  <span className="stat-chip">Материал {formatMoney(room.material_price_per_m2)}/м²</span>
                  <span className="stat-chip">Работа {formatMoney(room.labor_price_per_m2)}/м²</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                  <span className="stat-chip">
                    Подложка{" "}
                    {room.underlay_qty > 0
                      ? `${trimFloat(room.underlay_qty)} м²`
                      : getUnderlayModeLabel(covering?.underlay_mode ?? "none")}
                  </span>
                  <span className="stat-chip">Клей {room.glue_qty > 0 ? `${trimFloat(room.glue_qty)} ${room.glue_unit}` : "—"}</span>
                  <span className="stat-chip">
                    Грунт {room.primer_qty > 0 ? `${trimFloat(room.primer_qty)} ${room.primer_unit}` : "—"}
                  </span>
                  <span className="stat-chip">СВП {room.svp_qty > 0 ? `${trimFloat(room.svp_qty)} ${room.svp_unit}` : "—"}</span>
                  <span className="stat-chip">
                    Затирка {room.grout_qty > 0 ? `${trimFloat(room.grout_qty)} ${room.grout_unit}` : "—"}
                  </span>
                  <span className="stat-chip">Плинтус {room.plinth_m > 0 ? formatMeters(room.plinth_m) : "—"}</span>
                </div>
                {covering?.note ? <div className="calculator-stage-note-line mt-2">{covering.note}</div> : null}
              </div>
              <div className="text-sm font-semibold text-cyan-100">{formatMoney(room.total_cost)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
