import type {
  FamilyDetail,
  MaterialFamily,
  MaterialSearchResult,
  MaterialSku,
  MaterialVariant,
} from "../../shared/types";
import { fetchJson, toNullableNumber } from "../../shared/utils";

export function fetchMaterialFamilies() {
  return fetchJson<MaterialFamily[]>("/api/materials/families?limit=100");
}

export function fetchMaterialFamilyDetail(familyId: number) {
  return fetchJson<FamilyDetail>(`/api/materials/families/${familyId}`);
}

export function searchMaterialCatalog(query: string) {
  const encoded = encodeURIComponent(query.trim());
  return fetchJson<MaterialSearchResult[]>(`/api/materials/search?q=${encoded}`);
}

export function createMaterialFamily(form: {
  canonical_name: string;
  default_unit: string;
  category: string;
  dialog_fields: string[];
}) {
  return fetchJson<MaterialFamily>("/api/materials/families", {
    method: "POST",
    body: JSON.stringify({
      canonical_name: form.canonical_name,
      default_unit: form.default_unit,
      category: form.category || null,
      dialog_fields: form.dialog_fields,
    }),
  });
}

export function createMaterialVariant(familyId: number, displayName: string) {
  return fetchJson<MaterialVariant>("/api/materials/variants", {
    method: "POST",
    body: JSON.stringify({
      family_id: familyId,
      display_name: displayName,
    }),
  });
}

export function createMaterialSku(
  familyId: number,
  form: {
    variant_id: string;
    title: string;
    article: string;
    brand: string;
    unit: string;
    thickness_mm: string;
    length_mm: string;
    width_mm: string;
  },
) {
  return fetchJson<MaterialSku>("/api/materials/skus", {
    method: "POST",
    body: JSON.stringify({
      family_id: familyId,
      variant_id: form.variant_id ? Number(form.variant_id) : null,
      title: form.title,
      article: form.article || null,
      brand: form.brand || null,
      unit: form.unit,
      thickness_mm: toNullableNumber(form.thickness_mm),
      length_mm: toNullableNumber(form.length_mm),
      width_mm: toNullableNumber(form.width_mm),
    }),
  });
}

export function createMaterialAlias(form: {
  alias: string;
  target: "family" | "variant" | "sku";
  target_id: string;
}) {
  const targetId = Number(form.target_id);
  return fetchJson<{ created_count: number }>("/api/materials/aliases", {
    method: "POST",
    body: JSON.stringify({
      alias: form.alias,
      family_id: form.target === "family" ? targetId : null,
      variant_id: form.target === "variant" ? targetId : null,
      sku_id: form.target === "sku" ? targetId : null,
    }),
  });
}
