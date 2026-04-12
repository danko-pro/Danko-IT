import type { Dispatch, FormEvent, SetStateAction } from "react";

import { MetricChip, SelectField, TextField, formatArea, formatMeters, openingTypeOptions, trimFloat } from "./calculator-shared";
import type { CalculatorProjectDetail, CalculatorRoomDetail, RoomEditState } from "./calculator";

type RoomsStageSidebarSectionProps = {
  projectDetail: CalculatorProjectDetail | null;
  selectedRoomId: number | null;
  busyKey: string | null;
  onCreateRoom: (projectId: number) => Promise<void> | void;
  onSelectRoom: (roomId: number) => void;
};

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
          <button
            type="button"
            className="secondary-button"
            disabled={busyKey === `calculator-room-create-${projectDetail.project.id}`}
            onClick={() => void onCreateRoom(projectDetail.project.id)}
          >
            {busyKey === `calculator-room-create-${projectDetail.project.id}` ? "..." : "Добавить помещение"}
          </button>
        ) : null}
      </div>

      {projectDetail ? (
        <div className="space-y-2">
          {projectDetail.rooms.map((room) => {
            const active = room.id === selectedRoomId;
            return (
              <button
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
              </button>
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

type RoomsStageEditorSectionProps = {
  roomDetail: CalculatorRoomDetail | null;
  roomLoading: boolean;
  detailLoading: boolean;
  roomState: RoomEditState;
  setRoomState: Dispatch<SetStateAction<RoomEditState>>;
  busyKey: string | null;
  handleRoomSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  onDeleteRoom: (roomId: number) => Promise<void> | void;
};

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
            <TextField label="Название помещения" value={roomState.name} onChange={(value) => setRoomState((current) => ({ ...current, name: value }))} />
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
              Формула: `P ≈ 4 × √Sпола × коэффициент`. `1.0` это почти квадрат, `1.1-1.3` более вытянутое помещение.
            </div>
          </div>

          <TextField
            label="Комментарий"
            value={roomState.note}
            onChange={(value) => setRoomState((current) => ({ ...current, note: value }))}
            placeholder="Свободная заметка по помещению"
          />

          <div className="subpanel p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Стены для периметра</div>
              <button
                type="button"
                className="micro-action"
                onClick={() => setRoomState((current) => ({ ...current, walls_m: [...current.walls_m, ""] }))}
              >
                Добавить стену
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {roomState.walls_m.map((wall, index) => (
                <div key={`wall-${index}`} className="flex gap-2">
                  <TextField
                    label={`Стена ${index + 1}, м`}
                    value={wall}
                    onChange={(value) =>
                      setRoomState((current) => ({
                        ...current,
                        walls_m: current.walls_m.map((item, itemIndex) => (itemIndex === index ? value : item)),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="micro-action micro-action-danger mt-[22px]"
                    onClick={() =>
                      setRoomState((current) => ({
                        ...current,
                        walls_m: current.walls_m.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="subpanel p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Участки пола</div>
              <button
                type="button"
                className="micro-action"
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    floor_sections: [...current.floor_sections, { length_m: "", width_m: "" }],
                  }))
                }
              >
                Добавить участок
              </button>
            </div>
            <div className="space-y-2">
              {roomState.floor_sections.map((section, index) => (
                <div key={`section-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <TextField
                    label={`Длина ${index + 1}, м`}
                    value={section.length_m}
                    onChange={(value) =>
                      setRoomState((current) => ({
                        ...current,
                        floor_sections: current.floor_sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, length_m: value } : item,
                        ),
                      }))
                    }
                  />
                  <TextField
                    label={`Ширина ${index + 1}, м`}
                    value={section.width_m}
                    onChange={(value) =>
                      setRoomState((current) => ({
                        ...current,
                        floor_sections: current.floor_sections.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, width_m: value } : item,
                        ),
                      }))
                    }
                  />
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="micro-action micro-action-danger"
                      onClick={() =>
                        setRoomState((current) => ({
                          ...current,
                          floor_sections: current.floor_sections.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="subpanel p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Окна и проемы</div>
              <button
                type="button"
                className="micro-action"
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    openings: [
                      ...current.openings,
                      { opening_type: "window", width_m: "", height_m: "", quantity: "1", area_m2: "", note: "" },
                    ],
                  }))
                }
              >
                Добавить проем
              </button>
            </div>
            <div className="space-y-2">
              {roomState.openings.map((opening, index) => (
                <div key={`opening-${index}`} className="rounded-[12px] border border-cyan-400/10 bg-slate-950/82 p-3">
                  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <SelectField
                      label="Тип"
                      value={opening.opening_type}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, opening_type: value } : item,
                          ),
                        }))
                      }
                      options={openingTypeOptions}
                    />
                    <TextField
                      label="Ширина, м"
                      value={opening.width_m}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, width_m: value } : item,
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Высота, м"
                      value={opening.height_m}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, height_m: value } : item,
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Кол-во"
                      value={opening.quantity}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, quantity: value } : item,
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Площадь вручную, м²"
                      value={opening.area_m2}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, area_m2: value } : item,
                          ),
                        }))
                      }
                    />
                    <TextField
                      label="Примечание"
                      value={opening.note}
                      onChange={(value) =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, note: value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="micro-action micro-action-danger"
                      onClick={() =>
                        setRoomState((current) => ({
                          ...current,
                          openings: current.openings.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      Удалить проем
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <MetricChip label="Полы" value={formatArea(roomDetail.stats.floor_area_m2)} />
            <MetricChip label="Стены грязн." value={formatArea(roomDetail.stats.wall_area_gross_m2)} />
            <MetricChip label="Проёмы" value={formatArea(roomDetail.stats.openings_area_m2)} />
            <MetricChip label="Двери" value={formatArea(roomDetail.stats.door_area_m2)} />
            <MetricChip label="Стены чист." value={formatArea(roomDetail.stats.wall_area_net_m2)} />
            <MetricChip
              label={roomDetail.stats.is_perimeter_estimated ? "Периметр (≈)" : "Периметр"}
              value={formatMeters(roomDetail.stats.perimeter_m)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="action-button"
              disabled={busyKey === `calculator-room-save-${roomDetail.room.id}`}
            >
              {busyKey === `calculator-room-save-${roomDetail.room.id}` ? "Сохраняю..." : "Сохранить комнату"}
            </button>
            <button
              type="button"
              className="secondary-button micro-action-danger"
              disabled={busyKey === `calculator-room-delete-${roomDetail.room.id}`}
              onClick={() => void onDeleteRoom(roomDetail.room.id)}
            >
              {busyKey === `calculator-room-delete-${roomDetail.room.id}` ? "Удаляю..." : "Удалить комнату"}
            </button>
          </div>
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
