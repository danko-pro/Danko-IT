import { WarmFloorRoomCard, formatMoney, trimFloat } from "./";
import type { WarmFloorStageReadyProps } from "./";

export function WarmFloorStageEditorColumn(props: WarmFloorStageReadyProps) {
  const {
    warmFloorPreview,
    warmFloorRoomStateById,
    expandedWarmFloorRoomId,
    setExpandedWarmFloorRoomId,
    setWarmFloorState,
  } = props;

  return (
    <div className="space-y-3">
      <div className="subpanel p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Помещения тёплого пола</div>
          <div className="text-[12px] text-slate-400">
            Отметьте комнаты и при необходимости скорректируйте площадь
          </div>
        </div>

        <div className="space-y-2">
          {warmFloorPreview.rooms.map((room) => (
            <WarmFloorRoomCard
              key={room.room_id}
              room={room}
              edit={warmFloorRoomStateById.get(room.room_id)}
              expanded={expandedWarmFloorRoomId === room.room_id}
              setExpandedRoomId={setExpandedWarmFloorRoomId}
              setWarmFloorState={setWarmFloorState}
            />
          ))}
        </div>
      </div>

      <div className="section-separator">
        <span>Сметная спецификация</span>
      </div>

      <div className="subpanel p-3 space-y-2">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Спецификация для сметы</div>
        {warmFloorPreview.specification.length ? (
          <div className="space-y-2">
            {warmFloorPreview.specification.map((item) => (
              <div key={item.code} className="dense-row">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-100">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">{item.kind === "work" ? "Работы" : "Материалы"}</span>
                      <span className="stat-chip">
                        {trimFloat(item.quantity)} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{formatMoney(item.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Пока нет выбранных помещений для тёплого пола.
          </div>
        )}
      </div>
    </div>
  );
}
