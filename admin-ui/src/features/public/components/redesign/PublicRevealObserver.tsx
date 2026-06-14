import { useEffect } from "react";

export function PublicRevealObserver() {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return undefined;
    }

    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(".dk-reveal"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealTargets.forEach((element) => element.classList.add("dk-reveal--in"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("dk-reveal--in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" },
    );

    revealTargets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return null;
}
