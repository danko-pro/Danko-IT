import type { FormEvent } from "react";
import type { FamilyDetail, SkuFormState } from "../../shared/types";
import { Button } from "../../shared/controls";
import { Field, SelectField } from "../../shared/ui";

type MaterialsDetailSkuFormSectionProps = {
  familyDetail: FamilyDetail;
  skuForm: SkuFormState;
  savingSku: boolean;
  onSkuFormChange: (value: SkuFormState) => void;
  onCreateSku: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function MaterialsDetailSkuFormSection(props: MaterialsDetailSkuFormSectionProps) {
  return (
    <section className="glass-panel p-5">
      <div className="eyebrow">Добавить SKU</div>
      <h3 className="section-title mt-1.5">Новая закупаемая позиция</h3>
      <p className="panel-note mt-2">Отдельный SKU внутри семейства с брендом, артикулом и размерами.</p>

      <form className="mt-4 space-y-4" onSubmit={(event) => void props.onCreateSku(event)}>
        <Field
          label="Название позиции"
          value={props.skuForm.title}
          onChange={(value) => props.onSkuFormChange({ ...props.skuForm, title: value })}
          placeholder="Например: ГКЛ влагостойкий 12.5 мм 3000x1200 КНАУФ"
        />

        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label="Вариант"
            value={props.skuForm.variant_id}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, variant_id: value })}
            options={[
              { value: "", label: "Без варианта" },
              ...props.familyDetail.variants.map((variant) => ({
                value: String(variant.id),
                label: variant.display_name,
              })),
            ]}
          />
          <Field
            label="Бренд"
            value={props.skuForm.brand}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, brand: value })}
            placeholder="Knauf, Ceresit, Teknos"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Артикул поставщика"
            value={props.skuForm.article}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, article: value })}
            placeholder="Например: 123456"
          />
          <Field
            label="Единица"
            value={props.skuForm.unit}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, unit: value })}
            placeholder="шт / лист / мешок"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label="Толщина, мм"
            value={props.skuForm.thickness_mm}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, thickness_mm: value })}
            placeholder="12.5"
          />
          <Field
            label="Длина, мм"
            value={props.skuForm.length_mm}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, length_mm: value })}
            placeholder="3000"
          />
          <Field
            label="Ширина, мм"
            value={props.skuForm.width_mm}
            onChange={(value) => props.onSkuFormChange({ ...props.skuForm, width_mm: value })}
            placeholder="1200"
          />
        </div>

        <Button type="submit" disabled={props.savingSku}>
          {props.savingSku ? "Сохраняю..." : "Добавить SKU"}
        </Button>
      </form>
    </section>
  );
}
