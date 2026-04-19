import { Button } from "../../shared/controls";
import { SelectField, TextField, openingTypeOptions } from "./calculator-shared";
import type { RoomEditState } from "./calculator-types";
import type { RoomStateSetter } from "./calculator-rooms-stage-types";

type RoomOpeningsPanelProps = {
  roomState: RoomEditState;
  setRoomState: RoomStateSetter;
};

// Редактор окон и проёмов комнаты.
// Панель держит только CRUD операций над списком openings внутри draft-состояния.

export function RoomOpeningsPanel(props: RoomOpeningsPanelProps) {
  const { roomState, setRoomState } = props;

  return (
    <div className="subpanel p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">РћРєРЅР° Рё РїСЂРѕРµРјС‹</div>
        <Button
          type="button"
          variant="micro"
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
          Р”РѕР±Р°РІРёС‚СЊ РїСЂРѕРµРј
        </Button>
      </div>
      <div className="space-y-2">
        {roomState.openings.map((opening, index) => (
          <div key={`opening-${index}`} className="rounded-[12px] border border-cyan-400/10 bg-slate-950/82 p-3">
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              <SelectField
                label="РўРёРї"
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
                label="РЁРёСЂРёРЅР°, Рј"
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
                label="Р’С‹СЃРѕС‚Р°, Рј"
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
                label="РљРѕР»-РІРѕ"
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
                label="РџР»РѕС‰Р°РґСЊ РІСЂСѓС‡РЅСѓСЋ, РјВІ"
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
                label="РџСЂРёРјРµС‡Р°РЅРёРµ"
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
              <Button
                type="button"
                variant="micro"
                tone="danger"
                onClick={() =>
                  setRoomState((current) => ({
                    ...current,
                    openings: current.openings.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                РЈРґР°Р»РёС‚СЊ РїСЂРѕРµРј
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
