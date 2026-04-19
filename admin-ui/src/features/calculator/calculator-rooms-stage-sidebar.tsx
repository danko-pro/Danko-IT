import { Button } from "../../shared/controls";
import { formatArea, formatMeters, trimFloat } from "./calculator-shared";
import type { RoomsStageSidebarSectionProps } from "./calculator-rooms-stage-types";

// Боковая колонка room stage.
// Показывает список помещений проекта и быстрый переход между ними.

export function RoomsStageSidebarSection(props: RoomsStageSidebarSectionProps) {
  const { projectDetail, selectedRoomId, busyKey, onCreateRoom, onSelectRoom } = props;

  return (
    <section className="glass-panel p-4 stage-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Сводка</div>
          <h3 className="section-title mt-1.5">Помещения и итог по объекту</h3>
        </div>
        {projectDetail ? (
          <Button
            type="button"
            variant="secondary"
            disabled={busyKey === `calculator-room-create-${projectDetail.project.id}`}
            onClick={() => void onCreateRoom(projectDetail.project.id)}
          >
            {busyKey === `calculator-room-create-${projectDetail.project.id}` ? "..." : "Добавить помещение"}
          </Button>
        ) : null}
      </div>

      {projectDetail ? (
        <div className="space-y-2">
          {projectDetail.rooms.map((room) => {
            const active = room.id === selectedRoomId;
            return (
              <Button
                key={room.id}
                type="button"
                className={active ? "dense-row dense-row-active w-full text-left" : "dense-row w-full text-left"}
                onClick={() => onSelectRoom(room.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{room.name}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[12px] text-slate-400">
                      <span className="stat-chip">{formatArea(room.floor_area_m2)}</span>
                      <span className="stat-chip">{formatArea(room.wall_area_net_m2)} стен</span>
                      <span className="stat-chip">{formatMeters(room.perimeter_m)}</span>
                    </div>
                  </div>
                  <span className="slot-chip">H {trimFloat(room.ceiling_height_m)} м</span>
                </div>
              </Button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Выберите проект слева, чтобы работать с помещениями.
        </div>
      )}
    </section>
  );
}
