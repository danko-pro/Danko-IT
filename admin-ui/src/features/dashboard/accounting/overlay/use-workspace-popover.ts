import { useLayoutEffect, useRef, useState } from "react";

export function useWorkspacePopover(isOpen: boolean, preferredMaxHeight = 320, minimumHeight = 120) {
  const [menuPlacement, setMenuPlacement] = useState<"up" | "down">("down");
  const [menuMaxHeight, setMenuMaxHeight] = useState<number>(preferredMaxHeight);
  const [menuMaxWidth, setMenuMaxWidth] = useState<number>(520);
  const [menuOffsetX, setMenuOffsetX] = useState<number>(0);
  const [menuArrowOffsetX, setMenuArrowOffsetX] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !rootRef.current || !menuRef.current) {
      return;
    }

    const measureMenu = () => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root || !menu) {
        return;
      }

      const workspace = root.closest(".dashboard-ledger-workspace");
      if (!(workspace instanceof HTMLElement)) {
        setMenuPlacement("down");
        setMenuMaxHeight(preferredMaxHeight);
        setMenuOffsetX(0);
        setMenuArrowOffsetX(null);
        return;
      }

      const gap = 8;
      const workspaceRect = workspace.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const shellWidth = Math.max(menu.getBoundingClientRect().width, rootRect.width, 0);
      const menuHeight = menu.scrollHeight;
      const menuBody =
        menu.firstElementChild instanceof HTMLElement ? menu.firstElementChild : menu;
      const menuWidth = Math.max(menuBody.getBoundingClientRect().width, menuBody.scrollWidth, 0);
      const spaceBelow = Math.max(workspaceRect.bottom - rootRect.bottom - gap, 0);
      const spaceAbove = Math.max(rootRect.top - workspaceRect.top - gap, 0);
      const workspaceInnerWidth = Math.max(workspaceRect.width - gap * 2, 240);
      const effectiveMenuWidth = Math.max(Math.min(menuWidth, workspaceInnerWidth), rootRect.width);
      const shouldOpenUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;
      const availableSpace = shouldOpenUp ? spaceAbove : spaceBelow;
      const desiredLeft = rootRect.left;
      const minimumLeft = workspaceRect.left + gap;
      const maximumLeft = workspaceRect.right - gap - effectiveMenuWidth;
      const clampedLeft = Math.min(Math.max(desiredLeft, minimumLeft), Math.max(minimumLeft, maximumLeft));
      const nextOffsetX = clampedLeft - desiredLeft;
      const rawArrowAnchor = rootRect.width / 2 - nextOffsetX;
      const nextArrowOffset = Math.min(
        Math.max(rawArrowAnchor - 6, 10),
        Math.max(shellWidth - 14, 10),
      );

      setMenuPlacement(shouldOpenUp ? "up" : "down");
      setMenuMaxHeight(Math.max(Math.min(availableSpace, preferredMaxHeight), minimumHeight));
      setMenuMaxWidth(workspaceInnerWidth);
      setMenuOffsetX(nextOffsetX);
      setMenuArrowOffsetX(nextArrowOffset);
    };

    measureMenu();
    window.addEventListener("resize", measureMenu);
    window.addEventListener("scroll", measureMenu, true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measureMenu()) : null;
    if (resizeObserver) {
      resizeObserver.observe(menuRef.current);
      resizeObserver.observe(rootRef.current);
      const menuBody =
        menuRef.current.firstElementChild instanceof HTMLElement ? menuRef.current.firstElementChild : null;
      if (menuBody) {
        resizeObserver.observe(menuBody);
      }
    }

    return () => {
      window.removeEventListener("resize", measureMenu);
      window.removeEventListener("scroll", measureMenu, true);
      resizeObserver?.disconnect();
    };
  }, [isOpen, minimumHeight, preferredMaxHeight]);

  return {
    rootRef,
    menuRef,
    menuPlacement,
    menuMaxHeight,
    menuMaxWidth,
    menuOffsetX,
    menuArrowOffsetX,
  };
}
