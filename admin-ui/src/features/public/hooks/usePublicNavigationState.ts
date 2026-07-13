import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

const SECTION_IDS = ["projects", "approach", "platform", "pricing", "contacts"] as const;

export function usePublicNavigationState(
  isMenuOpen: boolean,
  setIsMenuOpen: Dispatch<SetStateAction<boolean>>,
) {
  const [activeHref, setActiveHref] = useState<string>();

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveHref(`#${visible.target.id}`);
      },
      { rootMargin: "-22% 0px -62%", threshold: [0, 0.1, 0.35] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth > 760) setIsMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    document.body.classList.add("dk-menu-lock");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
      document.body.classList.remove("dk-menu-lock");
    };
  }, [isMenuOpen, setIsMenuOpen]);

  return activeHref;
}
