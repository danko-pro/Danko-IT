import { useEffect, useRef, useState } from "react";

import { publicContourSections } from "../public-content";

export function usePublicContourRoute() {
  const [activeContourSection, setActiveContourSection] = useState("");
  const [contourScrollDirection, setContourScrollDirection] = useState<"down" | "up">("down");
  const lastContourScrollYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const contourSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-public-contour-section]"),
    );

    if (contourSections.length === 0) {
      return;
    }

    let animationFrameId: number | null = null;
    lastContourScrollYRef.current = window.scrollY;

    const updateActiveContourSection = () => {
      animationFrameId = null;

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastContourScrollYRef.current;

      if (Math.abs(scrollDelta) > 4) {
        lastContourScrollYRef.current = currentScrollY;
        setContourScrollDirection(scrollDelta > 0 ? "down" : "up");
      }

      const activationLine = window.innerHeight * 0.48;
      let nextSection = "";
      let closestDistance = Number.POSITIVE_INFINITY;

      contourSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const isInRange = rect.top <= window.innerHeight * 0.72 && rect.bottom >= window.innerHeight * 0.18;

        if (!isInRange) {
          return;
        }

        const distance = Math.abs(rect.top + rect.height * 0.18 - activationLine);

        if (distance < closestDistance) {
          closestDistance = distance;
          nextSection = section.dataset.publicContourSection ?? "";
        }
      });

      if (nextSection) {
        setActiveContourSection((currentSection) => (currentSection === nextSection ? currentSection : nextSection));
      } else if (window.scrollY < 120) {
        setActiveContourSection("");
      }
    };

    const requestContourUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(updateActiveContourSection);
    };

    const observer = new IntersectionObserver(
      () => requestContourUpdate(),
      {
        root: null,
        rootMargin: "-12% 0px -24% 0px",
        threshold: [0, 0.2, 0.45, 0.7],
      },
    );

    contourSections.forEach((section) => observer.observe(section));
    requestContourUpdate();
    window.addEventListener("scroll", requestContourUpdate, { passive: true });
    window.addEventListener("resize", requestContourUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestContourUpdate);
      window.removeEventListener("resize", requestContourUpdate);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const getContourClassName = (sectionName: string, side: "left" | "right") => {
    const activeIndex = publicContourSections.indexOf(
      activeContourSection as (typeof publicContourSections)[number],
    );
    const sectionIndex = publicContourSections.indexOf(sectionName as (typeof publicContourSections)[number]);
    const isActive = activeIndex === sectionIndex && sectionIndex !== -1;
    const isComplete = activeIndex > sectionIndex && sectionIndex !== -1;

    return `public-section-contour public-section-contour-${side} public-section-contour-${contourScrollDirection}${
      isActive ? " public-section-contour-active" : ""
    }${isComplete ? " public-section-contour-complete" : ""}`;
  };

  return { getContourClassName };
}
