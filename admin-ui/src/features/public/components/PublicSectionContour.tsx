type PublicSectionContourProps = {
  sectionName: string;
  side: "left" | "right";
  getContourClassName: (sectionName: string, side: "left" | "right") => string;
};

function getContourPath(side: "left" | "right") {
  return side === "left"
    ? "M 100 -14 V -4 Q 100 0 96 0 H 4 Q 0 0 0 4 V 100"
    : "M 0 0 H 96 Q 100 0 100 4 V 100";
}

export function PublicSectionContour({ sectionName, side, getContourClassName }: PublicSectionContourProps) {
  const contourPath = getContourPath(side);

  return (
    <span className={getContourClassName(sectionName, side)} aria-hidden="true">
      <svg className="public-contour-svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <path className="public-contour-path" d={contourPath} />
        <path className="public-contour-pulse-path" d={contourPath} pathLength={100} />
      </svg>
    </span>
  );
}
