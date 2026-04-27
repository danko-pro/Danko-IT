import { formatArea, formatMeters } from "../shared";
import type { CalculatorRoomDetail } from "./model";

type RoomStatsSummaryProps = {
  roomDetail: CalculatorRoomDetail;
};

// Room-level metrics summary.
export function RoomStatsSummary(props: RoomStatsSummaryProps) {
  const { roomDetail } = props;
  const statsItems = [
    { label: "Полы", value: formatArea(roomDetail.stats.floor_area_m2) },
    { label: "Стены грязн.", value: formatArea(roomDetail.stats.wall_area_gross_m2) },
    { label: "Проёмы", value: formatArea(roomDetail.stats.openings_area_m2) },
    { label: "Двери", value: formatArea(roomDetail.stats.door_area_m2) },
    { label: "Стены чист.", value: formatArea(roomDetail.stats.wall_area_net_m2) },
    {
      label: roomDetail.stats.is_perimeter_estimated ? "Периметр (≈)" : "Периметр",
      value: formatMeters(roomDetail.stats.perimeter_m),
    },
  ];

  return (
    <div className="calculator-room-stats-summary">
      {statsItems.map((item) => (
        <div key={item.label} className="calculator-room-stat">
          <div className="calculator-room-stat-label">{item.label}</div>
          <div className="calculator-room-stat-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
