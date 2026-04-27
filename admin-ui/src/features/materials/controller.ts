import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useState } from "react";
import type {
  AliasFormState,
  FamilyDetail,
  FamilyFormState,
  MaterialFamily,
  MaterialSearchResult,
  ScreenKey,
  SkuFormState,
  VariantFormState,
} from "../../shared/types";
import { emptyAliasForm, emptyFamilyForm, emptySkuForm, emptyVariantForm } from "../../shared/types";
import {
  createMaterialAlias,
  createMaterialFamily,
  createMaterialSku,
  createMaterialVariant,
  fetchMaterialFamilies,
  fetchMaterialFamilyDetail,
  searchMaterialCatalog,
} from "./api";

type MaterialsControllerOptions = {
  setScreen: Dispatch<SetStateAction<ScreenKey>>;
  setSuccessMessage: Dispatch<SetStateAction<string | null>>;
};

// Контур каталога материалов: семейства, варианты, SKU, алиасы и поиск.
export function useAdminMaterialsController(props: MaterialsControllerOptions) {
  const [families, setFamilies] = useState<MaterialFamily[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null);
  const [familyDetail, setFamilyDetail] = useState<FamilyDetail | null>(null);

  const [familyForm, setFamilyForm] = useState<FamilyFormState>(emptyFamilyForm);
  const [variantForm, setVariantForm] = useState<VariantFormState>(emptyVariantForm);
  const [skuForm, setSkuForm] = useState<SkuFormState>(emptySkuForm());
  const [aliasForm, setAliasForm] = useState<AliasFormState>(emptyAliasForm);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MaterialSearchResult[]>([]);

  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [familyDetailLoading, setFamilyDetailLoading] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [savingSku, setSavingSku] = useState(false);
  const [savingAlias, setSavingAlias] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  useEffect(() => {
    if (families.length && selectedFamilyId === null) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  useEffect(() => {
    if (selectedFamilyId !== null) {
      void loadFamilyDetail(selectedFamilyId);
    }
  }, [selectedFamilyId]);

  useEffect(() => {
    setAliasForm((current) => ({
      ...current,
      target_id: selectedFamilyId ? String(selectedFamilyId) : "",
      target: "family",
    }));
  }, [selectedFamilyId]);

  async function loadFamilies() {
    try {
      setMaterialsLoading(true);
      const data = await fetchMaterialFamilies();
      setFamilies(data);
      setMaterialsError(null);
    } catch (loadError) {
      setMaterialsError(loadError instanceof Error ? loadError.message : "Не удалось загрузить каталог");
    } finally {
      setMaterialsLoading(false);
    }
  }

  async function loadFamilyDetail(familyId: number) {
    try {
      setFamilyDetailLoading(true);
      const data = await fetchMaterialFamilyDetail(familyId);
      setFamilyDetail(data);
      setSkuForm((current) => ({
        ...current,
        unit: current.unit || data.family.default_unit || "шт",
      }));
      setMaterialsError(null);
    } catch (loadError) {
      setFamilyDetail(null);
      setMaterialsError(loadError instanceof Error ? loadError.message : "Не удалось загрузить семейство");
    } finally {
      setFamilyDetailLoading(false);
    }
  }

  async function loadCatalogSearch(query: string) {
    setCatalogQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchMaterialCatalog(query);
      setSearchResults(results);
      setMaterialsError(null);
    } catch (loadError) {
      setSearchResults([]);
      setMaterialsError(loadError instanceof Error ? loadError.message : "Не удалось выполнить поиск");
    }
  }

  async function handleCreateFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSavingFamily(true);
      const created = await createMaterialFamily(familyForm);
      await loadFamilies();
      setSelectedFamilyId(created.id);
      setFamilyForm(emptyFamilyForm);
      props.setSuccessMessage(`Семейство "${created.canonical_name}" создано.`);
      setMaterialsError(null);
      props.setScreen("materials");
    } catch (saveError) {
      setMaterialsError(saveError instanceof Error ? saveError.message : "Не удалось создать семейство");
    } finally {
      setSavingFamily(false);
    }
  }

  async function handleCreateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFamilyId) {
      return;
    }
    try {
      setSavingVariant(true);
      await createMaterialVariant(selectedFamilyId, variantForm.display_name);
      await Promise.all([loadFamilies(), loadFamilyDetail(selectedFamilyId)]);
      setVariantForm(emptyVariantForm);
      props.setSuccessMessage("Вариант материала добавлен.");
      setMaterialsError(null);
    } catch (saveError) {
      setMaterialsError(saveError instanceof Error ? saveError.message : "Не удалось создать вариант");
    } finally {
      setSavingVariant(false);
    }
  }

  async function handleCreateSku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFamilyId) {
      return;
    }
    try {
      setSavingSku(true);
      await createMaterialSku(selectedFamilyId, skuForm);
      await Promise.all([loadFamilies(), loadFamilyDetail(selectedFamilyId)]);
      setSkuForm(emptySkuForm(familyDetail?.family.default_unit ?? "шт"));
      props.setSuccessMessage("SKU добавлен в каталог.");
      setMaterialsError(null);
    } catch (saveError) {
      setMaterialsError(saveError instanceof Error ? saveError.message : "Не удалось создать SKU");
    } finally {
      setSavingSku(false);
    }
  }

  async function handleCreateAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aliasForm.alias.trim() || !aliasForm.target_id) {
      setMaterialsError("Заполните алиас и выберите, к чему его привязать.");
      return;
    }

    const targetId = Number(aliasForm.target_id);
    if (!Number.isFinite(targetId)) {
      setMaterialsError("Некорректная цель для алиаса.");
      return;
    }

    try {
      setSavingAlias(true);
      await createMaterialAlias(aliasForm);
      if (selectedFamilyId) {
        await Promise.all([loadFamilies(), loadFamilyDetail(selectedFamilyId)]);
      }
      setAliasForm({
        alias: "",
        target: "family",
        target_id: selectedFamilyId ? String(selectedFamilyId) : "",
      });
      props.setSuccessMessage("Алиас добавлен.");
      setMaterialsError(null);
    } catch (saveError) {
      setMaterialsError(saveError instanceof Error ? saveError.message : "Не удалось добавить алиас");
    } finally {
      setSavingAlias(false);
    }
  }

  function toggleDialogField(code: string) {
    setFamilyForm((current) => {
      const exists = current.dialog_fields.includes(code);
      return {
        ...current,
        dialog_fields: exists
          ? current.dialog_fields.filter((field) => field !== code)
          : [...current.dialog_fields, code],
      };
    });
  }

  return {
    families,
    selectedFamilyId,
    setSelectedFamilyId,
    familyDetail,
    familyForm,
    setFamilyForm,
    variantForm,
    setVariantForm,
    skuForm,
    setSkuForm,
    aliasForm,
    setAliasForm,
    catalogQuery,
    searchResults,
    materialsLoading,
    familyDetailLoading,
    savingFamily,
    savingVariant,
    savingSku,
    savingAlias,
    materialsError,
    loadFamilies,
    loadFamilyDetail,
    loadCatalogSearch,
    handleCreateFamily,
    handleCreateVariant,
    handleCreateSku,
    handleCreateAlias,
    toggleDialogField,
  };
}
