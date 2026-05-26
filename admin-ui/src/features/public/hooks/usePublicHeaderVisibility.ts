import { useEffect, useState } from "react";

export function usePublicHeaderVisibility(isMenuOpen: boolean) {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      setIsHeaderHidden(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 80) {
        setIsHeaderHidden(false);
      } else if (currentScrollY > lastScrollY + 6) {
        setIsHeaderHidden(true);
      } else if (currentScrollY < lastScrollY - 6) {
        setIsHeaderHidden(false);
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(updateHeaderVisibility);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMenuOpen]);

  return isHeaderHidden;
}
