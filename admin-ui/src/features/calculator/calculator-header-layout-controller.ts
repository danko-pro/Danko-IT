import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";

import {
  calculatorHeaderCardWidthStorageKey,
  calculatorHeaderFontScaleStorageKey,
  readLocalNumber,
  writeLocalNumber,
} from "./calculator-state";

type UseCalculatorHeaderLayoutControllerResult = {
  calculatorHeaderStyle: CSSProperties;
  startHeaderResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  resetHeaderLayout: () => void;
};

// Контроллер layout-настроек шапки калькулятора.
// Отвечает только за размеры карточек, масштаб шрифта и их синхронизацию с local storage.

export function useCalculatorHeaderLayoutController(): UseCalculatorHeaderLayoutControllerResult {
  const [headerCardMinWidth, setHeaderCardMinWidth] = useState(() => readLocalNumber(calculatorHeaderCardWidthStorageKey, 188));
  const [headerFontScale, setHeaderFontScale] = useState(() => readLocalNumber(calculatorHeaderFontScaleStorageKey, 1));

  useEffect(() => {
    writeLocalNumber(calculatorHeaderCardWidthStorageKey, headerCardMinWidth);
  }, [headerCardMinWidth]);

  useEffect(() => {
    writeLocalNumber(calculatorHeaderFontScaleStorageKey, headerFontScale);
  }, [headerFontScale]);

  function startHeaderResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialWidth = headerCardMinWidth;
    const initialScale = headerFontScale;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(150, Math.min(320, initialWidth + moveEvent.clientX - startX));
      const nextScale = Math.max(0.84, Math.min(1.22, initialScale + (startY - moveEvent.clientY) * 0.0035));
      setHeaderCardMinWidth(nextWidth);
      setHeaderFontScale(Number(nextScale.toFixed(3)));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function resetHeaderLayout() {
    setHeaderCardMinWidth(188);
    setHeaderFontScale(1);
  }

  return {
    calculatorHeaderStyle: {
      "--calculator-header-card-min": `${headerCardMinWidth}px`,
      "--calculator-header-font-scale": String(headerFontScale),
    } as CSSProperties,
    startHeaderResize,
    resetHeaderLayout,
  };
}
