import { useEffect, useRef, useState } from "react";

const ROOM_REMOVE_DURATION_MS = 420;

type UseRoomRemoveParams = {
  onDeleteRoom: (roomId: number) => Promise<void> | void;
};

export function useRoomRemove(params: UseRoomRemoveParams) {
  const { onDeleteRoom } = params;
  const [confirmingRoomId, setConfirmingRoomId] = useState<number | null>(null);
  const [removingRoomIds, setRemovingRoomIds] = useState<number[]>([]);
  const removeTimeoutsRef = useRef<Record<number, number>>({});

  useEffect(() => {
    return () => {
      Object.values(removeTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  function requestRemove(roomId: number) {
    setConfirmingRoomId(roomId);
  }

  function cancelRemove() {
    setConfirmingRoomId(null);
  }

  function confirmRemove(roomId: number) {
    setRemovingRoomIds((current) => {
      if (current.includes(roomId)) {
        return current;
      }

      return [...current, roomId];
    });

    removeTimeoutsRef.current[roomId] = window.setTimeout(() => {
      void onDeleteRoom(roomId);
      setRemovingRoomIds((current) => current.filter((id) => id !== roomId));
      setConfirmingRoomId((current) => (current === roomId ? null : current));
      delete removeTimeoutsRef.current[roomId];
    }, ROOM_REMOVE_DURATION_MS);
  }

  return {
    confirmingRoomId,
    removingRoomIds,
    requestRemove,
    cancelRemove,
    confirmRemove,
  };
}
