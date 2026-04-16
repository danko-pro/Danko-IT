// Общие типы, формы по умолчанию и статические опции admin UI.

export type ScreenKey = "dashboard" | "requests" | "materials" | "calculator" | "editor" | "settings";

export type StatusTone = "ok" | "warn" | "neutral" | "active" | "error";

export type AdminAuthSession = {
  auth_enabled: boolean;
  authenticated: boolean;
  mode: "session" | "local-bypass";
  user: {
    subject: string;
    role: string;
  } | null;
  expires_at: string | null;
};

export type Summary = {
  families_count: number;
  skus_count: number;
  groups_count: number;
  active_drafts_count: number;
  confirmed_requests_count: number;
  confirmed_today_count: number;
  new_unknown_terms_count: number;
};

export type RecentRequest = {
  id: number;
  chat_id: number;
  master_id: number;
  master_name: string;
  status: string;
  waiting_for: string | null;
  updated_at: string;
  confirmed_delivery_date: string | null;
  confirmed_delivery_time: string | null;
  requested_delivery_date: string | null;
  requested_delivery_time: string | null;
  object_name: string;
  items_count: number;
};

export type RequestActionResult = {
  draft_id: number;
  status: string;
  notified: boolean;
  notification_error: string | null;
};

export type RequestDeliveryFormState = {
  delivery_date: string;
  delivery_time: string;
};

export type RequestItem = {
  id: number;
  raw_name: string | null;
  normalized_name: string | null;
  quantity: number | null;
  unit: string | null;
  thickness_mm: number | null;
  length_mm: number | null;
  width_mm: number | null;
  note: string | null;
  family_name: string | null;
  variant_name: string | null;
  sku_title: string | null;
};

export type DraftDetail = {
  id: number;
  status: string;
  master_name: string;
  waiting_for: string | null;
  confirmed_delivery_date: string | null;
  confirmed_delivery_time: string | null;
  requested_delivery_date: string | null;
  requested_delivery_time: string | null;
  proposed_delivery_date: string | null;
  proposed_delivery_time: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupProfile = {
  chat_id: number;
  title: string;
  object_name: string | null;
  address: string | null;
  flat: string | null;
  floor: string | null;
  elevator: string | null;
  delivery_start: string | null;
  delivery_end: string | null;
  delivery_fallback: string | null;
  updated_at?: string | null;
};

export type RequestDetail = {
  draft: DraftDetail;
  items: RequestItem[];
  group_profile: GroupProfile | null;
};

export type MaterialFamily = {
  id: number;
  code: string;
  canonical_name: string;
  default_unit: string;
  category: string | null;
  dialog_fields: string[];
  is_active: number;
  variants_count: number;
  skus_count: number;
  aliases_count: number;
};

export type MaterialVariant = {
  id: number;
  family_id: number;
  code: string;
  display_name: string;
  is_active: number;
};

export type MaterialSku = {
  id: number;
  family_id: number;
  variant_id: number | null;
  title: string;
  brand: string | null;
  supplier: string | null;
  supplier_article: string | null;
  unit: string;
  length_mm: number | null;
  width_mm: number | null;
  thickness_mm: number | null;
  area_m2: number | null;
  is_active: number;
};

export type MaterialAlias = {
  id: number;
  alias: string;
  normalized_alias: string;
  family_id: number | null;
  variant_id: number | null;
  sku_id: number | null;
  priority: number;
  is_active: number;
};

export type FamilyDetail = {
  family: MaterialFamily;
  variants: MaterialVariant[];
  skus: MaterialSku[];
  aliases: MaterialAlias[];
};

export type DeliverySettings = {
  delivery_start: string;
  delivery_end: string;
  delivery_fallback: string;
};

export type MaterialSearchResult = {
  type: "family" | "variant" | "sku" | "alias";
  id: number;
  title: string;
  family_id: number | null;
  variant_id: number | null;
  sku_id: number | null;
};

export type FamilyFormState = {
  canonical_name: string;
  default_unit: string;
  category: string;
  dialog_fields: string[];
};

export type VariantFormState = {
  display_name: string;
};

export type SkuFormState = {
  title: string;
  variant_id: string;
  article: string;
  brand: string;
  unit: string;
  thickness_mm: string;
  length_mm: string;
  width_mm: string;
};

export type AliasFormState = {
  alias: string;
  target: "family" | "variant" | "sku";
  target_id: string;
};

export type RequestItemFormState = {
  title: string;
  quantity: string;
  unit: string;
  thickness_mm: string;
  length_mm: string;
  width_mm: string;
  note: string;
};
export const dialogFieldOptions = [
  { code: "variant", label: "Тип / вариант" },
  { code: "thickness_mm", label: "Толщина" },
  { code: "size", label: "Размер" },
  { code: "quantity", label: "Количество" },
  { code: "note", label: "Комментарий" },
];

export const emptyFamilyForm: FamilyFormState = {
  canonical_name: "",
  default_unit: "шт",
  category: "",
  dialog_fields: ["quantity"],
};

export const emptyVariantForm: VariantFormState = {
  display_name: "",
};

export const emptySkuForm = (defaultUnit = "шт"): SkuFormState => ({
  title: "",
  variant_id: "",
  article: "",
  brand: "",
  unit: defaultUnit,
  thickness_mm: "",
  length_mm: "",
  width_mm: "",
});

export const emptyAliasForm: AliasFormState = {
  alias: "",
  target: "family",
  target_id: "",
};

export const emptyRequestDeliveryForm: RequestDeliveryFormState = {
  delivery_date: "",
  delivery_time: "",
};

export const emptyRequestItemForm: RequestItemFormState = {
  title: "",
  quantity: "",
  unit: "шт",
  thickness_mm: "",
  length_mm: "",
  width_mm: "",
  note: "",
};

