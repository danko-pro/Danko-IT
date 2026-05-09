import { defineWorkspaceRegistry, type WorkspaceCapabilityMap, type WorkspaceElementSchema } from "../../shared/workspace-contract";

const ROOT_ID = "materials.root";
const CATALOG_ID = "materials.catalog";
const FAMILY_CREATE_ID = "materials.family-create";
const DETAIL_ID = "materials.detail";
const VARIANTS_ID = "materials.detail.variants";
const ALIASES_ID = "materials.detail.aliases";
const SKUS_ID = "materials.detail.skus";
const SKU_FORM_ID = "materials.detail.sku-form";

function caps(overrides: Partial<WorkspaceCapabilityMap> = {}): WorkspaceCapabilityMap {
  return { movable: false, resizable: false, deletable: false, copyable: false, ...overrides };
}

function element(id: string, type: WorkspaceElementSchema["type"], role: WorkspaceElementSchema["role"], label: string, options: Partial<WorkspaceElementSchema> = {}): WorkspaceElementSchema {
  return { id, type, role, label, ...options };
}

const field = (id: string, label: string, dataKey: string, critical = false) => element(id, "input", "field", label, { dataKey, critical });
const metric = (id: string, label: string, dataKey: string, critical = false) => element(id, "metric", "summary", label, { dataKey, critical });
const button = (id: string, label: string, role: WorkspaceElementSchema["role"] = "primary-action") => element(id, "button", role, label);

export const materialsWorkspaceRegistry = defineWorkspaceRegistry({
  id: "materials",
  title: "Materials workspace",
  description: "Catalog workspace for material families, variants, SKUs, aliases and search-driven navigation.",
  components: [
    {
      id: ROOT_ID,
      type: "workspace",
      title: "Materials workspace root",
      dataKey: "materials",
      layoutParticipation: "none",
      capabilities: caps(),
      source: { feature: "materials", file: "screen.tsx" },
    },
    {
      id: CATALOG_ID,
      parentId: ROOT_ID,
      type: "list",
      title: "Materials catalog panel",
      dataKey: "materials.families[]",
      area: { x: 1, y: 1, w: 11, h: 28 },
      minArea: { w: 9, h: 14 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true }),
      children: [
        button("materials.catalog.reload", "Reload families", "secondary-action"),
        element("materials.catalog.error", "status", "status", "Catalog error", { dataKey: "materials.error" }),
        field("materials.catalog.search", "Catalog search", "materials.catalogQuery"),
        element("materials.catalog.search-result", "list-item", "navigation", "Catalog search result", { dataKey: "materials.searchResults[]" }),
        element("materials.catalog.family-row", "list-item", "navigation", "Material family row", { dataKey: "materials.families[]" }),
        metric("materials.catalog.family-count", "Family count", "materials.families.length"),
      ],
      relationships: [{ type: "selects", targetId: DETAIL_ID }, { type: "controls", targetId: FAMILY_CREATE_ID }],
      source: { feature: "materials", file: "catalog-panel.tsx" },
    },
    {
      id: FAMILY_CREATE_ID,
      parentId: CATALOG_ID,
      type: "form",
      title: "Create material family form",
      dataKey: "materials.familyForm",
      layoutParticipation: "none",
      capabilities: caps({ copyable: true }),
      children: [
        field("materials.family-create.name", "Family name", "materials.familyForm.canonical_name", true),
        field("materials.family-create.unit", "Default unit", "materials.familyForm.default_unit", true),
        field("materials.family-create.category", "Category", "materials.familyForm.category"),
        element("materials.family-create.dialog-field", "chip", "selector", "Dialog field toggle", {
          dataKey: "materials.familyForm.dialog_fields[]",
        }),
        element("materials.family-create.submit", "button", "submit-action", "Create material family", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: CATALOG_ID }, { type: "writes", targetId: DETAIL_ID }],
      source: { feature: "materials", file: "catalog-panel.tsx" },
    },
    {
      id: DETAIL_ID,
      parentId: ROOT_ID,
      type: "panel",
      title: "Material family detail panel",
      dataKey: "materials.familyDetail",
      area: { x: 12, y: 1, w: 19, h: 28 },
      minArea: { w: 12, h: 14 },
      priority: 100,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        metric("materials.detail.name", "Family name", "materials.familyDetail.family.canonical_name", true),
        metric("materials.detail.unit", "Default unit", "materials.familyDetail.family.default_unit", true),
        metric("materials.detail.category", "Category", "materials.familyDetail.family.category"),
        metric("materials.detail.dialog-fields", "Dialog fields", "materials.familyDetail.family.dialog_fields"),
      ],
      relationships: [
        { type: "controls", targetId: VARIANTS_ID },
        { type: "controls", targetId: ALIASES_ID },
        { type: "controls", targetId: SKUS_ID },
        { type: "controls", targetId: SKU_FORM_ID },
      ],
      source: { feature: "materials", file: "detail-panel.tsx" },
    },
    {
      id: VARIANTS_ID,
      parentId: DETAIL_ID,
      type: "list",
      title: "Material variants section",
      dataKey: "materials.familyDetail.variants[]",
      area: { x: 12, y: 8, w: 8, h: 7 },
      minArea: { w: 7, h: 5 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        element("materials.variants.row", "list-item", "summary", "Material variant row", { dataKey: "materials.familyDetail.variants[]" }),
        field("materials.variants.display-name", "Variant display name", "materials.variantForm.display_name", true),
        element("materials.variants.submit", "button", "submit-action", "Create material variant", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: DETAIL_ID }, { type: "writes", targetId: CATALOG_ID }],
      source: { feature: "materials", file: "detail-variants-section.tsx" },
    },
    {
      id: ALIASES_ID,
      parentId: DETAIL_ID,
      type: "list",
      title: "Material aliases section",
      dataKey: "materials.familyDetail.aliases[]",
      area: { x: 20, y: 8, w: 11, h: 7 },
      minArea: { w: 8, h: 5 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        element("materials.aliases.row", "list-item", "summary", "Material alias row", { dataKey: "materials.familyDetail.aliases[]" }),
        field("materials.aliases.alias", "Alias", "materials.aliasForm.alias", true),
        element("materials.aliases.target-type", "select", "selector", "Alias target type", { dataKey: "materials.aliasForm.target" }),
        element("materials.aliases.target-id", "select", "selector", "Alias target", { dataKey: "materials.aliasForm.target_id", critical: true }),
        element("materials.aliases.submit", "button", "submit-action", "Create material alias", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: DETAIL_ID }, { type: "writes", targetId: CATALOG_ID }],
      source: { feature: "materials", file: "detail-aliases-section.tsx" },
    },
    {
      id: SKUS_ID,
      parentId: DETAIL_ID,
      type: "table",
      title: "Material SKU table",
      dataKey: "materials.familyDetail.skus[]",
      area: { x: 12, y: 16, w: 19, h: 6 },
      minArea: { w: 12, h: 5 },
      priority: 80,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        element("materials.skus.row", "list-item", "summary", "Material SKU row", { dataKey: "materials.familyDetail.skus[]" }),
        metric("materials.skus.title", "SKU title", "materials.familyDetail.skus[].title", true),
        metric("materials.skus.brand", "SKU brand", "materials.familyDetail.skus[].brand"),
        metric("materials.skus.article", "Supplier article", "materials.familyDetail.skus[].supplier_article"),
        metric("materials.skus.dimensions", "SKU dimensions", "materials.familyDetail.skus[].dimensions"),
      ],
      relationships: [{ type: "summarizes", targetId: DETAIL_ID }],
      source: { feature: "materials", file: "detail-skus-section.tsx" },
    },
    {
      id: SKU_FORM_ID,
      parentId: DETAIL_ID,
      type: "form",
      title: "Create material SKU form",
      dataKey: "materials.skuForm",
      area: { x: 12, y: 23, w: 19, h: 7 },
      minArea: { w: 12, h: 6 },
      priority: 90,
      capabilities: caps({ resizable: true, collapsible: true, copyable: true }),
      children: [
        field("materials.sku-form.title", "SKU title", "materials.skuForm.title", true),
        element("materials.sku-form.variant", "select", "selector", "SKU variant", { dataKey: "materials.skuForm.variant_id" }),
        field("materials.sku-form.brand", "Brand", "materials.skuForm.brand"),
        field("materials.sku-form.article", "Supplier article", "materials.skuForm.article"),
        field("materials.sku-form.unit", "Unit", "materials.skuForm.unit", true),
        field("materials.sku-form.thickness", "Thickness", "materials.skuForm.thickness_mm"),
        field("materials.sku-form.length", "Length", "materials.skuForm.length_mm"),
        field("materials.sku-form.width", "Width", "materials.skuForm.width_mm"),
        element("materials.sku-form.submit", "button", "submit-action", "Create material SKU", { critical: true }),
      ],
      relationships: [{ type: "writes", targetId: SKUS_ID }, { type: "writes", targetId: DETAIL_ID }, { type: "writes", targetId: CATALOG_ID }],
      source: { feature: "materials", file: "detail-sku-form-section.tsx" },
    },
  ],
});
