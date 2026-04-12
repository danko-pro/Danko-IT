import type { FormEvent } from "react";
import type {
  AliasFormState,
  FamilyDetail,
  FamilyFormState,
  MaterialFamily,
  MaterialSearchResult,
  SkuFormState,
  VariantFormState,
} from "./app-types";
import { MaterialsCatalogPanel } from "./app-screen-materials-catalog";
import { MaterialsDetailPanel } from "./app-screen-materials-detail";

// Экран каталога: shell из левой панели семейств и правой панели деталей.
export function MaterialsScreen(props: {
  families: MaterialFamily[];
  selectedFamilyId: number | null;
  familyDetail: FamilyDetail | null;
  loading: boolean;
  familyDetailLoading: boolean;
  error: string | null;
  familyForm: FamilyFormState;
  variantForm: VariantFormState;
  skuForm: SkuFormState;
  aliasForm: AliasFormState;
  searchResults: MaterialSearchResult[];
  catalogQuery: string;
  savingFamily: boolean;
  savingVariant: boolean;
  savingSku: boolean;
  savingAlias: boolean;
  onSelectFamily: (familyId: number) => void;
  onFamilyFormChange: (value: FamilyFormState) => void;
  onVariantFormChange: (value: VariantFormState) => void;
  onSkuFormChange: (value: SkuFormState) => void;
  onAliasFormChange: (value: AliasFormState) => void;
  onToggleDialogField: (code: string) => void;
  onCreateFamily: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateVariant: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateSku: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateAlias: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReloadFamilies: () => Promise<void>;
  onSearchCatalog: (query: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[0.82fr_1.38fr]">
      <MaterialsCatalogPanel
        families={props.families}
        selectedFamilyId={props.selectedFamilyId}
        loading={props.loading}
        error={props.error}
        familyForm={props.familyForm}
        searchResults={props.searchResults}
        catalogQuery={props.catalogQuery}
        savingFamily={props.savingFamily}
        onSelectFamily={props.onSelectFamily}
        onFamilyFormChange={props.onFamilyFormChange}
        onToggleDialogField={props.onToggleDialogField}
        onCreateFamily={props.onCreateFamily}
        onReloadFamilies={props.onReloadFamilies}
        onSearchCatalog={props.onSearchCatalog}
      />

      <MaterialsDetailPanel
        familyDetail={props.familyDetail}
        familyDetailLoading={props.familyDetailLoading}
        variantForm={props.variantForm}
        skuForm={props.skuForm}
        aliasForm={props.aliasForm}
        savingVariant={props.savingVariant}
        savingSku={props.savingSku}
        savingAlias={props.savingAlias}
        onVariantFormChange={props.onVariantFormChange}
        onSkuFormChange={props.onSkuFormChange}
        onAliasFormChange={props.onAliasFormChange}
        onCreateVariant={props.onCreateVariant}
        onCreateSku={props.onCreateSku}
        onCreateAlias={props.onCreateAlias}
      />
    </div>
  );
}
