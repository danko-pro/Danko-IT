import { publicProjectItems } from "../../public-content";

export type PublicProjectItem = (typeof publicProjectItems)[number];
export type PublicProjectImage = {
  src: string;
  alt?: string;
};
export type PublicProjectScopeGroup = {
  title: string;
  items: string[];
};

export type PublicProjectWithDetails = PublicProjectItem & {
  caseIntro?: string;
  caseStats?: Array<{ value: string; label: string }>;
  imageAlt?: string;
  imageSrc?: string;
  images?: PublicProjectImage[];
  location?: string;
  mapUrl?: string;
  priceNote?: string;
  pricePerMeter?: string;
  scope?: PublicProjectScopeGroup[];
  shortName?: string;
};

const PACKAGE_PRICE_PER_METER: Record<string, string> = {
  A: "от 75 000 ₽/м²",
  B: "от 52 000 ₽/м²",
  C: "от 40 000 ₽/м²",
};

export function getProjectCaseIntro(project: PublicProjectItem) {
  const intro = (project as PublicProjectWithDetails).caseIntro;

  return typeof intro === "string" && intro.length > 0 ? intro : undefined;
}

export function getProjectCaseStats(project: PublicProjectItem) {
  const stats = (project as PublicProjectWithDetails).caseStats;

  return Array.isArray(stats) ? stats.filter((stat) => stat.value.length > 0 && stat.label.length > 0) : [];
}

export function getProjectSummary(project: PublicProjectItem) {
  const intro = getProjectCaseIntro(project);

  if (intro) {
    return intro;
  }

  const scope = getProjectScope(project);

  return scope.length > 0
    ? scope.flatMap((group) => group.items).slice(0, 6).join(" · ")
    : `Ремонт под ключ: дизайн, отделка и комплектация под задачу объекта (${project.type}).`;
}

export function getProjectPrice(project: PublicProjectItem) {
  const projectWithDetails = project as PublicProjectWithDetails;
  const value = projectWithDetails.pricePerMeter ?? PACKAGE_PRICE_PER_METER[project.package];

  if (!value) return undefined;

  return {
    value,
    note: projectWithDetails.priceNote ?? `ориентир пакета ${project.package}; точная стоимость — после сметы`,
  };
}

export function getProjectImages(project: PublicProjectItem) {
  const projectWithDetails = project as PublicProjectWithDetails;

  if (Array.isArray(projectWithDetails.images) && projectWithDetails.images.length > 0) {
    return projectWithDetails.images.filter((image) => typeof image.src === "string" && image.src.length > 0);
  }

  if (typeof projectWithDetails.imageSrc === "string" && projectWithDetails.imageSrc.length > 0) {
    return [{ src: projectWithDetails.imageSrc, alt: projectWithDetails.imageAlt }];
  }

  return [];
}

export function getProjectShortName(project: PublicProjectItem) {
  const shortName = (project as PublicProjectWithDetails).shortName;

  return typeof shortName === "string" && shortName.length > 0 ? shortName : project.name;
}

export function getProjectSubtitle(project: PublicProjectItem) {
  const location = (project as PublicProjectWithDetails).location;

  return typeof location === "string" && location.length > 0 ? location : project.type;
}

export function getProjectScope(project: PublicProjectItem) {
  const scope = (project as PublicProjectWithDetails).scope;

  return Array.isArray(scope) ? scope.filter((group) => group.items.length > 0) : [];
}

export function getProjectMapUrl(project: PublicProjectItem) {
  const mapUrl = (project as PublicProjectWithDetails).mapUrl;

  return typeof mapUrl === "string" && mapUrl.length > 0 ? mapUrl : undefined;
}
