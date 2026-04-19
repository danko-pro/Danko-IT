import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { RoomEditState } from "./calculator-types";
import type { RoomStateSetter } from "./calculator-rooms-stage-types";

type RoomWallsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

// Редактор стен для расчёта периметра.
// Панель отвечает только за список длин стен и операции add/remove/update.

export function RoomWallsPanel(props: RoomWallsPanelProps) {
  const { roomState, setRoomState } = props;

  return (
    <div className="subpanel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">РЎС‚РµРЅС‹ РґР»СЏ РїРµСЂРёРјРµС‚СЂР°</div>
        <Button
          type="button"
          variant="micro"
          onClick={() => setRoomState((current) => ({ ...current, walls_m: [...current.walls_m, ""] }))}
        >
          Р”РѕР±Р°РІРёС‚СЊ СЃС‚РµРЅСѓ
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {roomState.walls_m.map((wall, index) => (
          <div key={`wall-${index}`} className="flex gap-2">
            <TextField
              label={`РЎС‚РµРЅР° ${index + 1}, Рј`}
              value={wall}
              onChange={(value) =>
                setRoomState((current) => ({
                  ...current,
                  walls_m: current.walls_m.map((item, itemIndex) => (itemIndex === index ? value : item)),
                }))
              }
            />
            <Button
              type="button"
              variant="micro"
              tone="danger"
              className="mt-[22px]"
              onClick={() =>
                setRoomState((current) => ({
                  ...current,
                  walls_m: current.walls_m.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              Г—
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
