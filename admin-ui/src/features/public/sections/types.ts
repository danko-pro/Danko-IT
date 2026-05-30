import type { EstimateSectionId } from "../public-estimate-model";

export type EstimateNavigationIcon =
  | "object"
  | "geometry"
  | "warmFloor"
  | "flooring"
  | "walls"
  | "ceiling"
  | "electric"
  | "plumbing"
  | "doors"
  | "completion"
  | "appliances"
  | "furniture"
  | "cleaning"
  | "total";

export type EstimateNavigationItem = {
  id: string;
  label: string;
  icon: EstimateNavigationIcon;
};

export type EstimateSectionDescriptor = {
  id: string;
  label: string;
  icon: EstimateNavigationIcon;
  className: string;
  estimateSectionId?: EstimateSectionId;
};
