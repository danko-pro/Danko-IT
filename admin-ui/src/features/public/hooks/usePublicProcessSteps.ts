import { useEffect, useRef, useState } from "react";

import { PROCESS_STEP_SWITCH_DELAY_MS, publicProcessSteps } from "../public-content";

export function usePublicProcessSteps() {
  const [activeProcessIndex, setActiveProcessIndex] = useState(-1);
  const processStepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const activeProcessIndexRef = useRef(-1);
  const lastProcessScrollYRef = useRef(0);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 860px)");
    if (!mediaQuery.matches) {
      return;
    }

    let animationFrameId: number | null = null;
    let processSwitchTimerId: number | null = null;
    let queuedProcessIndex = activeProcessIndexRef.current;
    lastProcessScrollYRef.current = window.scrollY;

    const commitQueuedProcessIndex = () => {
      processSwitchTimerId = null;

      const currentIndex = activeProcessIndexRef.current;
      if (queuedProcessIndex === currentIndex) {
        return;
      }

      const nextIndex = queuedProcessIndex > currentIndex ? currentIndex + 1 : currentIndex - 1;
      activeProcessIndexRef.current = nextIndex;
      setActiveProcessIndex(nextIndex);

      if (nextIndex !== queuedProcessIndex) {
        processSwitchTimerId = window.setTimeout(commitQueuedProcessIndex, PROCESS_STEP_SWITCH_DELAY_MS);
      }
    };

    const applyGuardedProcessIndex = (targetIndex: number) => {
      const currentIndex = activeProcessIndexRef.current;
      const safeTargetIndex = Math.max(0, Math.min(publicProcessSteps.length - 1, targetIndex));
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastProcessScrollYRef.current;
      lastProcessScrollYRef.current = currentScrollY;

      if (safeTargetIndex === currentIndex) {
        queuedProcessIndex = currentIndex;
        return false;
      }

      const direction =
        scrollDelta > 1 ? 1 : scrollDelta < -1 ? -1 : safeTargetIndex > currentIndex ? 1 : -1;

      if ((safeTargetIndex > currentIndex && direction < 0) || (safeTargetIndex < currentIndex && direction > 0)) {
        return false;
      }

      queuedProcessIndex = safeTargetIndex;

      if (processSwitchTimerId === null) {
        processSwitchTimerId = window.setTimeout(commitQueuedProcessIndex, PROCESS_STEP_SWITCH_DELAY_MS);
      }

      return false;
    };

    const updateActiveProcessStep = () => {
      animationFrameId = null;

      let targetIndex = activeProcessIndexRef.current;
      let hasActivatedStep = false;
      const activationLine = window.innerHeight * 0.55;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;

      if (pageBottom - scrollBottom <= 4) {
        if (applyGuardedProcessIndex(publicProcessSteps.length - 1)) {
          requestProcessUpdate();
        }

        return;
      }

      processStepRefs.current.forEach((step, index) => {
        if (!step) {
          return;
        }

        const rect = step.getBoundingClientRect();
        const isVisible = rect.bottom >= 0 && rect.top <= window.innerHeight;

        if (!isVisible) {
          return;
        }

        if (rect.top <= activationLine) {
          targetIndex = index;
          hasActivatedStep = true;
        }
      });

      if (hasActivatedStep && applyGuardedProcessIndex(targetIndex)) {
        requestProcessUpdate();
      }
    };

    const requestProcessUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateActiveProcessStep);
    };

    const observer = new IntersectionObserver(
      () => requestProcessUpdate(),
      {
        root: null,
        rootMargin: "-25% 0px -20% 0px",
        threshold: [0, 0.2, 0.5, 0.8],
      },
    );

    processStepRefs.current.forEach((step) => {
      if (step) {
        observer.observe(step);
      }
    });

    requestProcessUpdate();
    window.addEventListener("scroll", requestProcessUpdate, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestProcessUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      if (processSwitchTimerId !== null) {
        window.clearTimeout(processSwitchTimerId);
      }
    };
  }, []);

  return { activeProcessIndex, processStepRefs };
}
