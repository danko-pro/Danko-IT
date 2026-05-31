import {
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { parseEstimateDecimal, type EstimateRoomInput } from "../public-estimate-geometry";
import {
  normalizeEstimateDecimalOnBlur,
  sanitizeEstimateDecimalInput,
} from "../public-estimate-input";
import { calculateWarmFloor, type WarmFloorMode } from "../public-estimate-warm-floor";
import { type EstimateRoomDraft, type WarmFloorRoomDraft } from "./context";
import { buildWarmFloorSummaryItems } from "./summary";

export function useWarmFloorEstimate({
  rooms,
  roomInputs,
}: {
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
}) {
  const [warmFloorMode, setWarmFloorMode] = useState<WarmFloorMode>("water");
  const [warmFloorRooms, setWarmFloorRooms] = useState<Record<string, WarmFloorRoomDraft>>({});

  const warmFloorRoomInputs = useMemo(
    () =>
      rooms.map((room, index) => {
        const warmFloorDraft = warmFloorRooms[room.id] ?? {};

        return {
          roomId: room.id,
          roomName: room.name.trim() || "Помещение",
          area: roomInputs[index]?.area ?? 0,
          isSelected: warmFloorDraft.isSelected ?? room.type === "bathroom",
          warmFloorArea: parseEstimateDecimal(warmFloorDraft.warmFloorArea ?? room.area),
        };
      }),
    [roomInputs, rooms, warmFloorRooms],
  );

  const warmFloorResult = useMemo(
    () => calculateWarmFloor(warmFloorMode, warmFloorRoomInputs),
    [warmFloorMode, warmFloorRoomInputs],
  );

  const warmFloorModeLabel = warmFloorMode === "water" ? "Водяной" : "Электрический";
  const warmFloorConnectionLabel =
    warmFloorMode === "electric"
      ? "автомат в щит"
      : warmFloorResult.usesTowelRailConnection
        ? "малый контур от полотенцесушителя"
        : warmFloorResult.needsPump
          ? "гребенка + насосно-смесительный узел"
          : warmFloorResult.needsManifold
            ? "распределительная гребенка"
            : "без отдельного узла";
  const warmFloorSummaryItems = buildWarmFloorSummaryItems(warmFloorMode, warmFloorResult);

  const updateWarmFloorRoom = useCallback((roomId: string, patch: WarmFloorRoomDraft) => {
    setWarmFloorRooms((currentRooms) => ({
      ...currentRooms,
      [roomId]: {
        ...currentRooms[roomId],
        ...patch,
      },
    }));
  }, []);

  const removeWarmFloorRoom = useCallback((roomId: string) => {
    setWarmFloorRooms((currentRooms) => {
      const nextRooms = { ...currentRooms };

      delete nextRooms[roomId];

      return nextRooms;
    });
  }, []);

  const onWarmFloorRoomSelectedChange = useCallback(
    (roomId: string, isSelected: boolean) => {
      updateWarmFloorRoom(roomId, { isSelected });
    },
    [updateWarmFloorRoom],
  );

  const onWarmFloorAreaChange = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateWarmFloorRoom(roomId, {
        warmFloorArea: sanitizeEstimateDecimalInput(event.target.value),
      });
    },
    [updateWarmFloorRoom],
  );

  const onWarmFloorAreaBlur = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateWarmFloorRoom(roomId, {
        warmFloorArea: normalizeEstimateDecimalOnBlur(event.target.value),
      });
    },
    [updateWarmFloorRoom],
  );

  return {
    warmFloorMode,
    setWarmFloorMode,
    warmFloorRooms,
    warmFloorResult,
    warmFloorModeLabel,
    warmFloorConnectionLabel,
    warmFloorSummaryItems,
    removeWarmFloorRoom,
    onWarmFloorRoomSelectedChange,
    onWarmFloorAreaChange,
    onWarmFloorAreaBlur,
  };
}
