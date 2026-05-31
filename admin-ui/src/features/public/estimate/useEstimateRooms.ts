import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  calculateEstimateGeometryTotals,
  calculateEstimateRoomGeometry,
  parseEstimateDecimal,
  type EstimateGeometryTotals,
  type EstimateRoomGeometry,
  type EstimateRoomInput,
} from "../public-estimate-geometry";
import {
  normalizeEstimateCeilingHeightOnBlur,
  normalizeEstimateCountOnBlur,
  normalizeEstimateDecimalOnBlur,
  sanitizeEstimateDecimalInput,
  sanitizeEstimateIntegerInput,
} from "../public-estimate-input";
import { GEOMETRY_ROW_REMOVE_MS, initialRooms } from "./defaults";
import {
  buildNewRoomName,
  inferRoomTypeFromName,
  normalizeEstimateRoomDraft,
  normalizeRoom,
  type EstimateRoomDraft,
} from "./context";

function getGeometryRowRemoveDelayMs(): number {
  if (typeof window === "undefined") {
    return GEOMETRY_ROW_REMOVE_MS;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : GEOMETRY_ROW_REMOVE_MS;
}

function prefersReducedEstimateMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createEstimateRoom(existingRooms: EstimateRoomDraft[]): EstimateRoomDraft {
  return normalizeEstimateRoomDraft({
    id: `room-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: buildNewRoomName(existingRooms),
    type: "other",
    area: "",
    doorCount: "1",
    windowCount: "0",
  });
}

export function useEstimateRooms({
  onRoomRemoved,
}: {
  onRoomRemoved: (roomId: string) => void;
}): {
  ceilingHeightInput: string;
  rooms: EstimateRoomDraft[];
  roomInputs: EstimateRoomInput[];
  roomGeometries: EstimateRoomGeometry[];
  totals: EstimateGeometryTotals;
  enteringRoomIds: string[];
  removingRoomIds: string[];

  onCeilingHeightChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCeilingHeightBlur: (event: ChangeEvent<HTMLInputElement>) => void;

  onRoomNameChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomAreaChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomAreaBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomDoorCountChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomDoorCountBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomWindowCountChange: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onRoomWindowCountBlur: (roomId: string, event: ChangeEvent<HTMLInputElement>) => void;

  addRoom: () => void;
  removeRoom: (roomId: string) => void;
} {
  const [ceilingHeightInput, setCeilingHeightInput] = useState("2.7");
  const [rooms, setRooms] = useState<EstimateRoomDraft[]>(() => initialRooms.map(normalizeEstimateRoomDraft));
  const pendingAddedRoomIdRef = useRef<string | null>(null);
  const geometryRemoveTimeoutsRef = useRef<Record<string, number>>({});
  const [enteringRoomIds, setEnteringRoomIds] = useState<string[]>([]);
  const [removingRoomIds, setRemovingRoomIds] = useState<string[]>([]);

  const ceilingHeight = useMemo(() => parseEstimateDecimal(ceilingHeightInput), [ceilingHeightInput]);
  const roomInputs = useMemo(() => rooms.map(normalizeRoom), [rooms]);
  const roomGeometries = useMemo(
    () => roomInputs.map((room) => calculateEstimateRoomGeometry(room, ceilingHeight)),
    [roomInputs, ceilingHeight],
  );
  const totals = useMemo(() => calculateEstimateGeometryTotals(roomGeometries), [roomGeometries]);

  useEffect(() => {
    return () => {
      Object.values(geometryRemoveTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  useLayoutEffect(() => {
    if (!enteringRoomIds.length) {
      return;
    }

    if (prefersReducedEstimateMotion()) {
      setEnteringRoomIds([]);
      return;
    }

    let outerFrame = 0;
    let innerFrame = 0;

    outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        setEnteringRoomIds([]);
      });
    });

    return () => {
      if (outerFrame) {
        window.cancelAnimationFrame(outerFrame);
      }

      if (innerFrame) {
        window.cancelAnimationFrame(innerFrame);
      }
    };
  }, [enteringRoomIds]);

  useEffect(() => {
    const roomId = pendingAddedRoomIdRef.current;

    if (!roomId) {
      return;
    }

    const row = document.querySelector<HTMLElement>(`[data-estimate-room-id="${roomId}"]`);

    if (!row) {
      return;
    }

    pendingAddedRoomIdRef.current = null;

    const nameInput = row.querySelector<HTMLInputElement>(".public-estimate-room-name input");
    const prefersReducedMotion = prefersReducedEstimateMotion();

    nameInput?.focus({ preventScroll: true });
    nameInput?.select();
    row.scrollIntoView({
      block: prefersReducedMotion ? "nearest" : "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [rooms]);

  const updateRoom = useCallback((roomId: string, patch: Partial<EstimateRoomDraft>) => {
    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId) {
          return room;
        }

        const nextRoom = normalizeEstimateRoomDraft({ ...room, ...patch });

        if ("name" in patch) {
          const inferredType = inferRoomTypeFromName(nextRoom.name);

          if (inferredType !== null) {
            nextRoom.type = inferredType;
          }
        }

        return nextRoom;
      }),
    );
  }, []);

  const finalizeRoomRemove = useCallback(
    (roomId: string) => {
      setRooms((currentRooms) =>
        currentRooms.length > 1 ? currentRooms.filter((room) => room.id !== roomId) : currentRooms,
      );
      onRoomRemoved(roomId);
      setRemovingRoomIds((current) => current.filter((id) => id !== roomId));
      delete geometryRemoveTimeoutsRef.current[roomId];
    },
    [onRoomRemoved],
  );

  const addRoom = useCallback(() => {
    let newRoomId = "";

    setRooms((currentRooms) => {
      const newRoom = createEstimateRoom(currentRooms);

      newRoomId = newRoom.id;
      pendingAddedRoomIdRef.current = newRoom.id;

      return [...currentRooms, newRoom];
    });

    if (!prefersReducedEstimateMotion() && newRoomId) {
      setEnteringRoomIds((current) => (current.includes(newRoomId) ? current : [...current, newRoomId]));
    }
  }, []);

  const removeRoom = useCallback(
    (roomId: string) => {
      if (rooms.length <= 1 || removingRoomIds.includes(roomId)) {
        return;
      }

      const removeDelayMs = getGeometryRowRemoveDelayMs();

      if (removeDelayMs === 0) {
        finalizeRoomRemove(roomId);
        return;
      }

      setRemovingRoomIds((current) => (current.includes(roomId) ? current : [...current, roomId]));

      geometryRemoveTimeoutsRef.current[roomId] = window.setTimeout(() => {
        finalizeRoomRemove(roomId);
      }, removeDelayMs);
    },
    [finalizeRoomRemove, removingRoomIds, rooms.length],
  );

  const onCeilingHeightChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCeilingHeightInput(sanitizeEstimateDecimalInput(event.target.value));
  }, []);

  const onCeilingHeightBlur = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCeilingHeightInput(normalizeEstimateCeilingHeightOnBlur(event.target.value));
  }, []);

  const onRoomNameChange = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { name: event.target.value });
    },
    [updateRoom],
  );

  const onRoomAreaChange = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { area: sanitizeEstimateDecimalInput(event.target.value) });
    },
    [updateRoom],
  );

  const onRoomAreaBlur = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { area: normalizeEstimateDecimalOnBlur(event.target.value) });
    },
    [updateRoom],
  );

  const onRoomDoorCountChange = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { doorCount: sanitizeEstimateIntegerInput(event.target.value) });
    },
    [updateRoom],
  );

  const onRoomDoorCountBlur = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { doorCount: normalizeEstimateCountOnBlur(event.target.value) });
    },
    [updateRoom],
  );

  const onRoomWindowCountChange = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { windowCount: sanitizeEstimateIntegerInput(event.target.value) });
    },
    [updateRoom],
  );

  const onRoomWindowCountBlur = useCallback(
    (roomId: string, event: ChangeEvent<HTMLInputElement>) => {
      updateRoom(roomId, { windowCount: normalizeEstimateCountOnBlur(event.target.value) });
    },
    [updateRoom],
  );

  return {
    ceilingHeightInput,
    rooms,
    roomInputs,
    roomGeometries,
    totals,
    enteringRoomIds,
    removingRoomIds,
    onCeilingHeightChange,
    onCeilingHeightBlur,
    onRoomNameChange,
    onRoomAreaChange,
    onRoomAreaBlur,
    onRoomDoorCountChange,
    onRoomDoorCountBlur,
    onRoomWindowCountChange,
    onRoomWindowCountBlur,
    addRoom,
    removeRoom,
  };
}
