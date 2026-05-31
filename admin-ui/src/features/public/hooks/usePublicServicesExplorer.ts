import { useCallback, useEffect, useRef, useState } from "react";

const PUBLIC_SERVICE_HOVER_DELAY_MS = 140;

export function usePublicServicesExplorer() {
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const serviceHoverTimerIdRef = useRef<number | null>(null);

  const clearServiceHoverTimer = useCallback(() => {
    if (serviceHoverTimerIdRef.current === null) {
      return;
    }

    window.clearTimeout(serviceHoverTimerIdRef.current);
    serviceHoverTimerIdRef.current = null;
  }, []);

  const activateServiceImmediately = useCallback(
    (index: number) => {
      clearServiceHoverTimer();
      setActiveServiceIndex(index);
    },
    [clearServiceHoverTimer],
  );

  const scheduleServiceActivation = useCallback(
    (index: number) => {
      clearServiceHoverTimer();

      if (index === activeServiceIndex) {
        return;
      }

      serviceHoverTimerIdRef.current = window.setTimeout(() => {
        serviceHoverTimerIdRef.current = null;
        setActiveServiceIndex(index);
      }, PUBLIC_SERVICE_HOVER_DELAY_MS);
    },
    [activeServiceIndex, clearServiceHoverTimer],
  );

  useEffect(() => () => clearServiceHoverTimer(), [clearServiceHoverTimer]);

  return {
    activeServiceIndex,
    setActiveServiceIndex,
    activateServiceImmediately,
    scheduleServiceActivation,
    clearServiceHoverTimer,
  };
}
