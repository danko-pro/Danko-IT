import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  ESTIMATE_INITIAL_SECTION_ID,
  ESTIMATE_SCROLL_SPY_SECTION_IDS,
} from "../sections/registry";

const ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX = 96;
const ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX = 64;
const ESTIMATE_MOBILE_BREAKPOINT_QUERY = "(max-width: 1180px)";

function getEstimateScrollActivationLinePx(): number {
  return window.matchMedia(ESTIMATE_MOBILE_BREAKPOINT_QUERY).matches
    ? ESTIMATE_SCROLL_ACTIVATION_LINE_MOBILE_PX
    : ESTIMATE_SCROLL_ACTIVATION_LINE_DESKTOP_PX;
}
const ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS = 3000;
const ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS = 150;
const ESTIMATE_SCROLL_STABILIZE_FRAMES = 4;
const ESTIMATE_SCROLL_STABILIZE_PX = 2;
const ESTIMATE_USER_SCROLL_CANCEL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

type EstimateNavigationScrollLock = {
  targetSectionId: string;
  cleanup: () => void;
};

function releaseEstimateNavigationScrollLock(
  lockRef: { current: EstimateNavigationScrollLock | null },
) {
  const lock = lockRef.current;

  if (!lock) {
    return;
  }

  lock.cleanup();
  lockRef.current = null;
}

function pickActiveEstimateSectionByScrollLine(
  sections: HTMLElement[],
  activationLinePx: number,
): string {
  let activeId = sections[0]?.id ?? ESTIMATE_INITIAL_SECTION_ID;

  for (const section of sections) {
    if (section.getBoundingClientRect().top <= activationLinePx) {
      activeId = section.id;
    }
  }

  return activeId;
}

export function useEstimateNavigation(): {
  activeEstimateSection: string;
  estimateRailScrollRef: RefObject<HTMLElement | null>;
  isMobileVolumesExpanded: boolean;
  toggleMobileVolumesExpanded: () => void;
  scrollToEstimateSection: (sectionId: string) => void;
} {
  const [isMobileVolumesExpanded, setIsMobileVolumesExpanded] = useState(false);
  const [activeEstimateSection, setActiveEstimateSection] = useState(ESTIMATE_INITIAL_SECTION_ID);
  const estimateRailScrollRef = useRef<HTMLElement>(null);
  const navigationScrollTargetRef = useRef<EstimateNavigationScrollLock | null>(null);

  const scrollToEstimateSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activationLinePx = getEstimateScrollActivationLinePx();
    const targetTop = Math.max(0, section.getBoundingClientRect().top + window.scrollY - activationLinePx);

    setActiveEstimateSection(sectionId);

    const cleanups: Array<() => void> = [];
    let released = false;

    const releaseLock = () => {
      if (released) {
        return;
      }

      released = true;
      cleanups.forEach((cleanup) => cleanup());

      if (navigationScrollTargetRef.current?.targetSectionId === sectionId) {
        navigationScrollTargetRef.current = null;
      }
    };

    const cancelLockForUserScroll = () => {
      releaseLock();
    };

    const handleUserScrollKeydown = (event: KeyboardEvent) => {
      if (ESTIMATE_USER_SCROLL_CANCEL_KEYS.has(event.key)) {
        cancelLockForUserScroll();
      }
    };

    window.addEventListener("wheel", cancelLockForUserScroll, { passive: true });
    window.addEventListener("touchstart", cancelLockForUserScroll, { passive: true });
    window.addEventListener("keydown", handleUserScrollKeydown);
    cleanups.push(() => {
      window.removeEventListener("wheel", cancelLockForUserScroll);
      window.removeEventListener("touchstart", cancelLockForUserScroll);
      window.removeEventListener("keydown", handleUserScrollKeydown);
    });

    const onScrollEnd = () => {
      releaseLock();
    };

    const scrollEndSupported = "onscrollend" in window;

    if (scrollEndSupported) {
      window.addEventListener("scrollend", onScrollEnd, { once: true });
      cleanups.push(() => window.removeEventListener("scrollend", onScrollEnd));
    } else {
      let lastScrollY = window.scrollY;
      let stableFrames = 0;
      let stabilizeFrameId = 0;

      const checkScrollStable = () => {
        if (released) {
          return;
        }

        const currentScrollY = window.scrollY;

        if (Math.abs(currentScrollY - lastScrollY) <= ESTIMATE_SCROLL_STABILIZE_PX) {
          stableFrames += 1;

          if (stableFrames >= ESTIMATE_SCROLL_STABILIZE_FRAMES) {
            releaseLock();
            return;
          }
        } else {
          stableFrames = 0;
          lastScrollY = currentScrollY;
        }

        stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      };

      stabilizeFrameId = window.requestAnimationFrame(checkScrollStable);
      cleanups.push(() => {
        if (stabilizeFrameId) {
          window.cancelAnimationFrame(stabilizeFrameId);
        }
      });
    }

    const maxLockMs = prefersReducedMotion
      ? ESTIMATE_PROGRAMMATIC_SCROLL_REDUCED_MOTION_MAX_MS
      : ESTIMATE_PROGRAMMATIC_SCROLL_MAX_MS;
    const timeoutId = window.setTimeout(releaseLock, maxLockMs);

    cleanups.push(() => window.clearTimeout(timeoutId));

    navigationScrollTargetRef.current = {
      targetSectionId: sectionId,
      cleanup: releaseLock,
    };

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (prefersReducedMotion) {
      window.requestAnimationFrame(() => {
        releaseLock();
      });
    }
  }, []);

  const isEstimatePageBottom = useCallback(() => {
    return (
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - ESTIMATE_PAGE_BOTTOM_THRESHOLD_PX
    );
  }, []);

  useEffect(() => {
    const sections = ESTIMATE_SCROLL_SPY_SECTION_IDS.map((sectionId) => document.getElementById(sectionId)).filter(
      (section): section is HTMLElement => Boolean(section),
    );

    if (!sections.length) {
      return;
    }

    let frameId = 0;

    const updateActiveSection = () => {
      const navigationScrollTarget = navigationScrollTargetRef.current;

      if (navigationScrollTarget) {
        setActiveEstimateSection((current) =>
          current === navigationScrollTarget.targetSectionId
            ? current
            : navigationScrollTarget.targetSectionId,
        );
        return;
      }

      if (isEstimatePageBottom()) {
        setActiveEstimateSection((current) => (current === "estimate-costs" ? current : "estimate-costs"));
        return;
      }

      const nextSectionId = pickActiveEstimateSectionByScrollLine(
        sections,
        getEstimateScrollActivationLinePx(),
      );

      setActiveEstimateSection((current) => (current === nextSectionId ? current : nextSectionId));
    };

    const handleScroll = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      releaseEstimateNavigationScrollLock(navigationScrollTargetRef);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isEstimatePageBottom]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const activeLink = railScroll.querySelector<HTMLAnchorElement>(`a[href="#${activeEstimateSection}"]`);

    if (!activeLink) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const isHorizontalRail = window.matchMedia("(max-width: 1180px)").matches;

    if (isHorizontalRail) {
      activeLink.scrollIntoView({
        behavior: scrollBehavior,
        block: "nearest",
        inline: "center",
      });
      return;
    }

    const railRect = railScroll.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const edgePadding = 10;

    if (linkRect.top >= railRect.top + edgePadding && linkRect.bottom <= railRect.bottom - edgePadding) {
      return;
    }

    const linkTop = linkRect.top - railRect.top + railScroll.scrollTop;
    const targetTop = linkTop - (railScroll.clientHeight - activeLink.offsetHeight) / 2;

    railScroll.scrollTo({
      top: Math.max(0, targetTop),
      behavior: scrollBehavior,
    });
  }, [activeEstimateSection]);

  useEffect(() => {
    const railScroll = estimateRailScrollRef.current;

    if (!railScroll) {
      return;
    }

    const horizontalRailQuery = window.matchMedia("(max-width: 1180px)");
    let dragPointerId: number | null = null;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let dragMoved = false;
    let suppressLinkClickUntil = 0;

    const isHorizontalRail = () => horizontalRailQuery.matches;

    const canScrollHorizontally = () => railScroll.scrollWidth > railScroll.clientWidth + 1;

    const handleWheel = (event: WheelEvent) => {
      if (!isHorizontalRail() || !canScrollHorizontally()) {
        return;
      }

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (delta === 0) {
        return;
      }

      railScroll.scrollLeft += delta;
      event.preventDefault();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isHorizontalRail() || event.button !== 0 || !canScrollHorizontally()) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScrollLeft = railScroll.scrollLeft;
      dragMoved = false;
      railScroll.classList.add("is-dragging");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      const deltaX = event.clientX - dragStartX;

      if (Math.abs(deltaX) > 4) {
        dragMoved = true;
      }

      railScroll.scrollLeft = dragStartScrollLeft - deltaX;
    };

    const finishDrag = (event: PointerEvent) => {
      if (dragPointerId === null || event.pointerId !== dragPointerId) {
        return;
      }

      if (dragMoved) {
        suppressLinkClickUntil = Date.now() + 300;
      }

      dragPointerId = null;
      dragMoved = false;
      railScroll.classList.remove("is-dragging");
    };

    const handleClickCapture = (event: MouseEvent) => {
      if (Date.now() < suppressLinkClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    railScroll.addEventListener("wheel", handleWheel, { passive: false });
    railScroll.addEventListener("pointerdown", handlePointerDown);
    railScroll.addEventListener("pointermove", handlePointerMove);
    railScroll.addEventListener("pointerup", finishDrag);
    railScroll.addEventListener("pointercancel", finishDrag);
    railScroll.addEventListener("click", handleClickCapture, true);

    return () => {
      railScroll.removeEventListener("wheel", handleWheel);
      railScroll.removeEventListener("pointerdown", handlePointerDown);
      railScroll.removeEventListener("pointermove", handlePointerMove);
      railScroll.removeEventListener("pointerup", finishDrag);
      railScroll.removeEventListener("pointercancel", finishDrag);
      railScroll.removeEventListener("click", handleClickCapture, true);
      railScroll.classList.remove("is-dragging");
    };
  }, []);

  const toggleMobileVolumesExpanded = useCallback(() => {
    setIsMobileVolumesExpanded((expanded) => !expanded);
  }, []);

  return {
    activeEstimateSection,
    estimateRailScrollRef,
    isMobileVolumesExpanded,
    toggleMobileVolumesExpanded,
    scrollToEstimateSection,
  };
}
