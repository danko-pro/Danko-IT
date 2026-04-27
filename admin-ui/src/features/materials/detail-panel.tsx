import type { FormEvent } from "react";
import type { AliasFormState, FamilyDetail, SkuFormState, VariantFormState } from "../../shared/types";
import { InfoCard } from "../../shared/ui";
import { MaterialsDetailAliasesSection } from "./detail-aliases-section";
import { MaterialsDetailSkuFormSection } from "./detail-sku-form-section";
import { MaterialsDetailSkusSection } from "./detail-skus-section";
import { MaterialsDetailVariantsSection } from "./detail-variants-section";

type MaterialsDetailPanelProps = {
  familyDetail: FamilyDetail | null;
  familyDetailLoading: boolean;
  variantForm: VariantFormState;
  skuForm: SkuFormState;
  aliasForm: AliasFormState;
  savingVariant: boolean;
  savingSku: boolean;
  savingAlias: boolean;
  onVariantFormChange: (value: VariantFormState) => void;
  onSkuFormChange: (value: SkuFormState) => void;
  onAliasFormChange: (value: AliasFormState) => void;
  onCreateVariant: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateSku: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateAlias: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

// Правая панель материалов: детали семейства, варианты, алиасы и SKU.
export function MaterialsDetailPanel(props: MaterialsDetailPanelProps) {
  if (props.familyDetailLoading) {
    return (
      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Семейство</div>
            <h3 className="panel-title">Детали и связанный каталог</h3>
          </div>
        </div>
        <div className="empty-state">Загружаю семейство...</div>
      </section>
    );
  }

  if (!props.familyDetail) {
    return (
      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Семейство</div>
            <h3 className="panel-title">Детали и связанный каталог</h3>
          </div>
        </div>
        <div className="empty-state">Выберите семейство слева, чтобы открыть детали.</div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Семейство</div>
            <h3 className="panel-title">Детали и связанный каталог</h3>
            <p className="panel-note mt-2">Центр управления семейством: варианты, алиасы и закупаемые позиции.</p>
          </div>
          <span className="slot-chip">#{props.familyDetail.family.id}</span>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard label="Название" value={props.familyDetail.family.canonical_name} />
            <InfoCard label="Единица" value={props.familyDetail.family.default_unit} />
            <InfoCard label="Категория" value={props.familyDetail.family.category ?? "—"} />
            <InfoCard
              label="Поля диалога"
              value={props.familyDetail.family.dialog_fields.length ? props.familyDetail.family.dialog_fields.join(", ") : "—"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <MaterialsDetailVariantsSection
              variants={props.familyDetail.variants}
              variantForm={props.variantForm}
              savingVariant={props.savingVariant}
              onVariantFormChange={props.onVariantFormChange}
              onCreateVariant={props.onCreateVariant}
            />
            <MaterialsDetailAliasesSection
              familyDetail={props.familyDetail}
              aliasForm={props.aliasForm}
              savingAlias={props.savingAlias}
              onAliasFormChange={props.onAliasFormChange}
              onCreateAlias={props.onCreateAlias}
            />
          </div>

          <MaterialsDetailSkusSection skus={props.familyDetail.skus} />
        </div>
      </section>

      <MaterialsDetailSkuFormSection
        familyDetail={props.familyDetail}
        skuForm={props.skuForm}
        savingSku={props.savingSku}
        onSkuFormChange={props.onSkuFormChange}
        onCreateSku={props.onCreateSku}
      />
    </div>
  );
}
