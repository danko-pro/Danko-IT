import type { FlooringStageReadyProps } from "./types";
import { toNumber } from "./";

type SetFlooring = Pick<FlooringStageReadyProps, "setFlooringState">;
type Zone = NonNullable<FlooringStageReadyProps["flooringState"]["rooms"][number]["zones"]>[number];
type Zones = Zone[];

export function updateZones(props: SetFlooring, roomId: number, zones: Zones) {
  const firstZone = zones[0];
  props.setFlooringState((current) => ({
    ...current,
    rooms: current.rooms.map((item) =>
      item.room_id === roomId
        ? {
            ...item,
            covering_id: firstZone?.covering_id ?? "",
            preparation_id: firstZone?.preparation_id ?? "",
            layout_id: firstZone?.layout_id ?? "",
            zones,
          }
        : item,
    ),
  }));
}

export function updateZone(props: SetFlooring, roomId: number, zones: Zones, zoneId: string, patch: Partial<Zone>) {
  updateZones(
    props,
    roomId,
    zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
  );
}

export function clampZoneArea(
  zones: Zones,
  zoneId: string,
  value: string,
  roomArea: number,
): { value: string; maxArea: number; exceeded: boolean } {
  const normalizedValue = value.replace(",", ".");
  const otherUsedArea = zones.reduce((total, zone) => {
    if (zone.id === zoneId) return total;
    return total + Math.max(0, toNumber(zone.area_m2) ?? 0);
  }, 0);
  const maxArea = Math.max(0, roomArea - otherUsedArea);
  const parsed = toNumber(normalizedValue);
  if (parsed === null || /[,.]$/.test(value.trim())) return { value: normalizedValue, maxArea, exceeded: false };
  const clamped = Math.min(Math.max(0, parsed), maxArea);
  return { value: String(Number(clamped.toFixed(2))), maxArea, exceeded: parsed > maxArea };
}

export function updateZoneArea(props: SetFlooring, roomId: number, zones: Zones, zoneId: string, value: string, roomArea: number) {
  updateZone(props, roomId, zones, zoneId, { area_m2: clampZoneArea(zones, zoneId, value, roomArea).value });
}

export function addZone(props: SetFlooring, roomId: number, zones: Zones, remainingArea: number) {
  updateZones(props, roomId, [
    ...zones,
    {
      id: String(Date.now()),
      covering_id: "",
      preparation_id: "",
      layout_id: "",
      area_m2: remainingArea > 0 ? String(Number(remainingArea.toFixed(2))) : "",
      note: "",
    },
  ]);
}

export function duplicateZone(props: SetFlooring, roomId: number, zones: Zones, zone: Zone) {
  updateZones(props, roomId, [...zones, { ...zone, id: String(Date.now()), area_m2: "" }]);
}

export function removeZone(props: SetFlooring, roomId: number, zones: Zones, zoneId: string) {
  updateZones(props, roomId, zones.length > 1 ? zones.filter((zone) => zone.id !== zoneId) : zones);
}
