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
  imageAlt?: string;
  imageSrc?: string;
  images?: PublicProjectImage[];
  location?: string;
  mapUrl?: string;
  scope?: PublicProjectScopeGroup[];
  shortName?: string;
};

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
