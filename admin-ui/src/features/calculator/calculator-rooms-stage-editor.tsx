import { TextField } from "./calculator-shared";
import { RoomFloorSectionsPanel } from "./calculator-room-floor-sections-panel";
import { RoomOpeningsPanel } from "./calculator-room-openings-panel";
import { RoomStatsPanel } from "./calculator-room-stats-panel";
import { RoomWallsPanel } from "./calculator-room-walls-panel";
import type { RoomsStageEditorSectionProps } from "./calculator-rooms-stage-types";

// Основной редактор room stage.
// Он собирает верхнеуровневую форму комнаты и делегирует большие блоки отдельным подкомпонентам.

export function RoomsStageEditorSection(props: RoomsStageEditorSectionProps) {
  const { roomDetail, roomLoading, detailLoading, roomState, setRoomState, busyKey, handleRoomSubmit, onDeleteRoom } = props;

  return (
    <section className="glass-panel p-4 stage-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Редактор комнаты</div>
          <h3 className="panel-title">Геометрия, полы и проемы</h3>
        </div>
      </div>

      {roomLoading || detailLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
          Загружаю данные помещения...
        </div>
      ) : null}

      {!roomLoading && !detailLoading && roomDetail ? (
        <form className="space-y-3" onSubmit={(event) => void handleRoomSubmit(event)}>
          <div className="grid gap-2 md:grid-cols-3">
            <TextField
              label="Название помещения"
              value={roomState.name}
              onChange={(value) => setRoomState((current) => ({ ...current, name: value }))}
            />
            <TextField
              label="Высота потолка, м"
              value={roomState.ceiling_height_m}
              onChange={(value) => setRoomState((current) => ({ ...current, ceiling_height_m: value }))}
            />
            <TextField
              label="Площадь пола вручную, м²"
              value={roomState.manual_floor_area_m2}
              onChange={(value) => setRoomState((current) => ({ ...current, manual_floor_area_m2: value }))}
              placeholder="Оставьте пусто для автосчёта"
            />
          </div>

          <div className="grid gap-2 md:grid-cols-[auto_180px_minmax(0,1fr)]">
            <label className="subpanel flex items-center gap-3 px-3 py-3">
              <input
                type="checkbox"
                checked={roomState.auto_perimeter_calc}
                onChange={(event) =>
                  setRoomState((current) => ({
                    ...current,
                    auto_perimeter_calc: event.target.checked,
                  }))
                }
              />
              <div>
                <div className="text-sm font-semibold text-slate-100">Авторасчёт периметра</div>
                <div className="mt-0.5 text-[12px] text-slate-400">Если стен пока нет, считать ориентировочно по площади пола</div>
              </div>
            </label>
            <TextField
              label="Коэф. формы"
              value={roomState.perimeter_factor}
              onChange={(value) => setRoomState((current) => ({ ...current, perimeter_factor: value }))}
              placeholder="1.15"
            />
            <div className="subpanel px-3 py-3 text-[12px] text-slate-400">
              ???????: `P ? 4 ? ?S???? ? ???????????`. `1.0` ??? ????? ???????, `1.1-1.3` ????? ????????? ?????????.
            </div>
          </div>

          <TextField
            label="Комментарий"
            value={roomState.note}
            onChange={(value) => setRoomState((current) => ({ ...current, note: value }))}
            placeholder="Свободная заметка по помещению"
          />

          <RoomWallsPanel roomState={roomState} setRoomState={setRoomState} />
          <RoomFloorSectionsPanel roomState={roomState} setRoomState={setRoomState} />
          <RoomOpeningsPanel roomState={roomState} setRoomState={setRoomState} />
          <RoomStatsPanel roomDetail={roomDetail} busyKey={busyKey} onDeleteRoom={onDeleteRoom} />
        </form>
      ) : null}

      {!roomLoading && !detailLoading && !roomDetail ? (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Выберите комнату слева или создайте новую.
        </div>
      ) : null}
    </section>
  );
}
