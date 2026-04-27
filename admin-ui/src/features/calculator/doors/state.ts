import type {
  DoorCatalogCreateState,
  DoorComponentCatalogCreateState,
  ProjectDoorComponentState,
  ProjectDoorCreateState,
} from "./model";

// Пустые draft-состояния дверного stage калькулятора.

export const emptyDoorCatalogState: DoorCatalogCreateState = {
  title: "",
  width_mm: "",
  height_mm: "",
  thickness_mm: "40",
  purchase_price: "",
  sale_price: "",
  install_price: "",
  note: "",
};

export const emptyProjectDoorState: ProjectDoorCreateState = {
  door_catalog_id: "",
  opening_kind: "door",
  title: "",
  width_mm: "",
  height_mm: "",
  thickness_mm: "",
  purchase_price: "",
  sale_price: "",
  install_price: "",
  room_a_id: "",
  room_b_id: "",
  note: "",
};

export const emptyDoorComponentCatalogState: DoorComponentCatalogCreateState = {
  category_code: "leaf",
  title: "",
  unit: "шт",
  purchase_price: "",
  sale_price: "",
  note: "",
};

export const emptyProjectDoorComponentState: ProjectDoorComponentState = {
  component_catalog_id: "",
  category_code: "leaf",
  title: "",
  unit: "шт",
  quantity: "1",
  purchase_price: "",
  sale_price: "",
  note: "",
};
