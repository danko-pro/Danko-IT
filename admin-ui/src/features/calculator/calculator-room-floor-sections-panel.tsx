import { Button } from "../../shared/controls";
import { TextField } from "./calculator-shared";
import type { RoomEditState } from "./calculator-types";
import type { RoomStateSetter } from "./calculator-rooms-stage-types";

type RoomFloorSectionsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

// Редактор участков пола комнаты.
// Изолирует список floor sections и их изменение без знания остальной формы комнаты.

export function RoomFloorSectionsPanel(props: RoomFloorSectionsPanelProps) {
  const { roomState, setRoomState } = props;

  return (
    <div className="subpanel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">РЈС‡Р°СЃС‚РєРё РїРѕР»Р°</div>
        <Button
          type="button"
          variant="micro"
          onClick={() =>
            setRoomState((current) => ({
              ...current,
              floor_sections: [...current.floor_sections, { length_m: "", width_m: "" }],
            }))
          }
        >
          Р”РѕР±Р°РІРёС‚СЊ СѓС‡Р°СЃС‚РѕРє
        </Button>
      </div>
      <div className="space-y-2">
        {roomState.floor_sections.map((section, index) => (
          <div key={`section-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <TextField
              label={`Р”Р»РёРЅР° ${index + 1}, Рј`}
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
              label={`РЁРёСЂРёРЅР° ${index + 1}, Рј`}
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
              <Button
                type="button"
                variant="micro"
                tone="danger"
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    floor_sections: current.floor_sections.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                РЈРґР°Р»РёС‚СЊ
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
