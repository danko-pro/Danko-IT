import { toInteger, toNumber } from "./calculator-shared";
import type {
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
} from "./calculator-types";

// Типы и builders для дверных payload-объектов калькулятора.
// Здесь держим единый transport-контракт для каталогов дверей, проектных дверей и комплектующих.

export type DoorCatalogPayload = {
  title: string;
  width_mm: number;
  height_mm: number;
  thickness_mm: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  note: string;
};

export type DoorComponentCatalogPayload = {
  category_code: string;
  title: string;
  unit: string;
  purchase_price: number | null;
  sale_price: number | null;
  note: string;
};

export type ProjectDoorPayload = {
  door_catalog_id: number | null;
  opening_kind: string;
  title: string | null;
  width_mm: number | null;
  height_mm: number | null;
  thickness_mm: number | null;
  purchase_price: number | null;
  sale_price: number | null;
  install_price: number | null;
  room_a_id: number | null;
  room_b_id: number | null;
  note: string | null;
};

export type ProjectDoorComponentPayload = {
  component_catalog_id: number | null;
  category_code: string | null;
  title: string | null;
  unit: string | null;
  quantity: number;
  purchase_price: number | null;
  sale_price: number | null;
  note: string | null;
};

export function buildDoorCatalogPayload(state: DoorCatalogCreateState): DoorCatalogPayload | null {
  const title = state.title.trim();
  const width = toNumber(state.width_mm);
  const height = toNumber(state.height_mm);
  if (!title || width === null || height === null) {
    return null;
  }
  return {
    title,
    width_mm: width,
    height_mm: height,
    thickness_mm: toNumber(state.thickness_mm),
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    install_price: toNumber(state.install_price),
    note: state.note,
  };
}

export function buildDoorComponentCatalogPayload(
  state: DoorComponentCatalogCreateState,
): DoorComponentCatalogPayload | null {
  const title = state.title.trim();
  if (!title) {
    return null;
  }
  return {
    category_code: state.category_code.trim() || "misc",
    title,
    unit: state.unit.trim() || "С€С‚",
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    note: state.note,
  };
}

export function buildProjectDoorPayload(state: ProjectDoorCreateState): ProjectDoorPayload {
  return {
    door_catalog_id: toInteger(state.door_catalog_id),
    opening_kind: state.opening_kind,
    title: state.title.trim() || null,
    width_mm: toNumber(state.width_mm),
    height_mm: toNumber(state.height_mm),
    thickness_mm: toNumber(state.thickness_mm),
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    install_price: toNumber(state.install_price),
    room_a_id: toInteger(state.room_a_id),
    room_b_id: toInteger(state.room_b_id),
    note: state.note.trim() || null,
  };
}

export function buildProjectDoorComponentPayload(state: ProjectDoorComponentState): ProjectDoorComponentPayload {
  return {
    component_catalog_id: toInteger(state.component_catalog_id),
    category_code: state.category_code.trim() || null,
    title: state.title.trim() || null,
    unit: state.unit.trim() || null,
    quantity: toNumber(state.quantity) ?? 1,
    purchase_price: toNumber(state.purchase_price),
    sale_price: toNumber(state.sale_price),
    note: state.note.trim() || null,
  };
}
