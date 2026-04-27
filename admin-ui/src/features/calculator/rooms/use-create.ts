import { useEffect, useRef, useState, type FormEvent } from "react";

import { toNumber } from "../shared";
import type { RoomsCreatePanelProps, RoomsCreateState } from "./types";

const DEFAULT_ROOM_HEIGHT = "2.7";
const DEFAULT_PERIMETER_FACTOR = 1.15;

const emptyCreateState: RoomsCreateState = {
  name: "",
  ceilingHeight: DEFAULT_ROOM_HEIGHT,
  autoPerimeterCalc: false,
  error: null,
};

export function useCreateRoom(params: RoomsCreatePanelProps) {
  const { projectId, roomSelectionToken, busyKey, onCreateRoom } = params;
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<RoomsCreateState>(emptyCreateState);
  const isCreating = busyKey === `calculator-room-create-${projectId}`;
  const lastSelectionTokenRef = useRef(roomSelectionToken);

  useEffect(() => {
    if (roomSelectionToken === lastSelectionTokenRef.current) {
      return;
    }

    lastSelectionTokenRef.current = roomSelectionToken;
    setState(emptyCreateState);
    setIsOpen(false);
  }, [roomSelectionToken]);

  function reset() {
    setState(emptyCreateState);
    setIsOpen(false);
  }

  function toggle() {
    if (isOpen) {
      reset();
      return;
    }

    setState((current) => ({ ...current, error: null }));
    setIsOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ceilingHeight = toNumber(state.ceilingHeight);

    if (ceilingHeight === null || ceilingHeight <= 0) {
      setState((current) => ({ ...current, error: "Укажите корректную высоту потолка." }));
      return;
    }

    setState((current) => ({ ...current, error: null }));

    await onCreateRoom(projectId, {
      name: state.name.trim() || undefined,
      ceiling_height_m: ceilingHeight,
      auto_perimeter_calc: state.autoPerimeterCalc,
      perimeter_factor: DEFAULT_PERIMETER_FACTOR,
    });

    reset();
  }

  return {
    isOpen,
    isCreating,
    state,
    toggle,
    reset,
    submit,
    setName: (value: string) => setState((current) => ({ ...current, name: value })),
    setCeilingHeight: (value: string) => setState((current) => ({ ...current, ceilingHeight: value })),
    setAutoPerimeterCalc: (value: boolean) => setState((current) => ({ ...current, autoPerimeterCalc: value })),
  };
}
