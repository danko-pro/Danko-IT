import type { AliasFormState, FamilyDetail, MaterialSearchResult } from "./types";

// Helper'ы для catalog/admin-форм: подписи типов поиска и выбор alias target.

export function searchTypeLabel(type: MaterialSearchResult["type"]): string {
  switch (type) {
    case "family":
      return "семейство";
    case "variant":
      return "вариант";
    case "sku":
      return "sku";
    case "alias":
      return "алиас";
    default:
      return type;
  }
}

export function aliasTargetOptions(
  familyDetail: FamilyDetail | null,
  target: AliasFormState["target"],
): Array<{ value: string; label: string }> {
  if (!familyDetail) {
    return [{ value: "", label: "Сначала выберите семейство" }];
  }

  if (target === "family") {
    return [{ value: String(familyDetail.family.id), label: familyDetail.family.canonical_name }];
  }

  if (target === "variant") {
    if (!familyDetail.variants.length) {
      return [{ value: "", label: "Нет вариантов в этом семействе" }];
    }
    return familyDetail.variants.map((variant) => ({
      value: String(variant.id),
      label: variant.display_name,
    }));
  }

  if (!familyDetail.skus.length) {
    return [{ value: "", label: "Нет SKU в этом семействе" }];
  }
  return familyDetail.skus.map((sku) => ({
    value: String(sku.id),
    label: sku.title,
  }));
}
