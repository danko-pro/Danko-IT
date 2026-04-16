import type { CSSProperties } from "react";

export type ResizableCloudPreset = {
  width: string;
  minWidth: string;
  maxWidth: string;
  minHeight: string;
};

export const counterpartyCloudPreset: ResizableCloudPreset = {
  width: "max(100%, 27rem)",
  minWidth: "24rem",
  maxWidth: "min(36rem, calc(100vw - 6rem))",
  minHeight: "19rem",
};

export function createResizableCloudStyle(
  maxHeight: number,
  preset: ResizableCloudPreset = counterpartyCloudPreset,
): CSSProperties {
  return {
    width: preset.width,
    minWidth: preset.minWidth,
    maxWidth: preset.maxWidth,
    minHeight: preset.minHeight,
    maxHeight: `${maxHeight}px`,
    overflow: "auto",
    resize: "both",
  };
}
