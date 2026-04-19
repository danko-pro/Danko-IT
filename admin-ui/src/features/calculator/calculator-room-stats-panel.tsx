import { Button } from "../../shared/controls";
import { MetricChip, formatArea, formatMeters } from "./calculator-shared";
import type { CalculatorRoomDetail } from "./calculator-types";

type RoomStatsPanelProps = {
  roomDetail: CalculatorRoomDetail;
  busyKey: string | null;
  onDeleteRoom: (roomId: number) => Promise<void> | void;
};

// Итоговая метрика и action-бар для комнаты.
// Панель показывает расчётные площади/периметр и кнопки сохранения/удаления.

export function RoomStatsPanel(props: RoomStatsPanelProps) {
  const { roomDetail, busyKey, onDeleteRoom } = props;

  return (
    <>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <MetricChip label="РџРѕР»С‹" value={formatArea(roomDetail.stats.floor_area_m2)} />
        <MetricChip label="РЎС‚РµРЅС‹ РіСЂСЏР·РЅ." value={formatArea(roomDetail.stats.wall_area_gross_m2)} />
        <MetricChip label="РџСЂРѕС‘РјС‹" value={formatArea(roomDetail.stats.openings_area_m2)} />
        <MetricChip label="Р”РІРµСЂРё" value={formatArea(roomDetail.stats.door_area_m2)} />
        <MetricChip label="РЎС‚РµРЅС‹ С‡РёСЃС‚." value={formatArea(roomDetail.stats.wall_area_net_m2)} />
        <MetricChip
          label={roomDetail.stats.is_perimeter_estimated ? "РџРµСЂРёРјРµС‚СЂ (в‰€)" : "РџРµСЂРёРјРµС‚СЂ"}
          value={formatMeters(roomDetail.stats.perimeter_m)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busyKey === `calculator-room-save-${roomDetail.room.id}`}>
          {busyKey === `calculator-room-save-${roomDetail.room.id}` ? "РЎРѕС…СЂР°РЅСЏСЋ..." : "РЎРѕС…СЂР°РЅРёС‚СЊ РєРѕРјРЅР°С‚Сѓ"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          tone="danger"
          disabled={busyKey === `calculator-room-delete-${roomDetail.room.id}`}
          onClick={() => void onDeleteRoom(roomDetail.room.id)}
        >
          {busyKey === `calculator-room-delete-${roomDetail.room.id}` ? "РЈРґР°Р»СЏСЋ..." : "РЈРґР°Р»РёС‚СЊ РєРѕРјРЅР°С‚Сѓ"}
        </Button>
      </div>
    </>
  );
}
