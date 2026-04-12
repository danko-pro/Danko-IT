import type { FormEvent } from "react";
import type { AliasFormState, FamilyDetail, SkuFormState, VariantFormState } from "./app-types";
import { Field, InfoCard, SelectField } from "./app-ui";
import { aliasTargetOptions, formatSkuDimensions } from "./app-utils";

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
  return (
    <div className="space-y-4">
      <section className="glass-panel p-4">
        <div className="panel-header">
          <div className="eyebrow">Семейство</div>
          <h3 className="panel-title">Детали и связанный каталог</h3>
        </div>

        {props.familyDetailLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
            Загружаю семейство...
          </div>
        ) : null}

        {!props.familyDetailLoading && props.familyDetail ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InfoCard label="Название" value={props.familyDetail.family.canonical_name} />
              <InfoCard label="Единица" value={props.familyDetail.family.default_unit} />
              <InfoCard label="Категория" value={props.familyDetail.family.category ?? "—"} />
              <InfoCard
                label="Поля диалога"
                value={props.familyDetail.family.dialog_fields.length ? props.familyDetail.family.dialog_fields.join(", ") : "—"}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="subpanel p-3.5">
                <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Варианты</div>
                <div className="space-y-2">
                  {props.familyDetail.variants.map((variant) => (
                    <div key={variant.id} className="rounded-[12px] border border-cyan-400/10 bg-slate-950/82 px-3 py-2.5">
                      <div className="text-sm font-medium text-slate-900">{variant.display_name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{variant.code}</div>
                    </div>
                  ))}
                  {!props.familyDetail.variants.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      Вариантов пока нет.
                    </div>
                  ) : null}
                </div>

                <form className="mt-3 space-y-3" onSubmit={(event) => void props.onCreateVariant(event)}>
                  <Field
                    label="Новый вариант"
                    value={props.variantForm.display_name}
                    onChange={(value) => props.onVariantFormChange({ display_name: value })}
                    placeholder="Например: влагостойкий"
                  />
                  <button type="submit" className="secondary-button" disabled={props.savingVariant}>
                    {props.savingVariant ? "Сохраняю..." : "Добавить вариант"}
                  </button>
                </form>
              </div>

              <div className="subpanel p-3.5">
                <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">Алиасы</div>
                <div className="space-y-2">
                  {props.familyDetail.aliases.slice(0, 8).map((alias) => (
                    <div key={alias.id} className="rounded-[12px] border border-cyan-400/10 bg-slate-950/82 px-3 py-2.5 text-sm text-slate-700">
                      <div className="text-sm font-medium text-slate-900">{alias.alias}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {alias.variant_id
                          ? "Привязан к варианту"
                          : alias.sku_id
                            ? "Привязан к SKU"
                            : "Привязан к семейству"}
                      </div>
                    </div>
                  ))}
                  {!props.familyDetail.aliases.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      Алиасов пока нет.
                    </div>
                  ) : null}
                </div>

                <form className="mt-3 space-y-3" onSubmit={(event) => void props.onCreateAlias(event)}>
                  <Field
                    label="Новый алиас"
                    value={props.aliasForm.alias}
                    onChange={(value) => props.onAliasFormChange({ ...props.aliasForm, alias: value })}
                    placeholder="Например: гипса, гклв, пеник"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <SelectField
                      label="К чему привязать"
                      value={props.aliasForm.target}
                      onChange={(value) =>
                        props.onAliasFormChange({
                          ...props.aliasForm,
                          target: value as AliasFormState["target"],
                          target_id: value === "family" ? String(props.familyDetail?.family.id ?? "") : "",
                        })
                      }
                      options={[
                        { value: "family", label: "К семейству" },
                        { value: "variant", label: "К варианту" },
                        { value: "sku", label: "К SKU" },
                      ]}
                    />
                    <SelectField
                      label="Цель"
                      value={props.aliasForm.target_id}
                      onChange={(value) => props.onAliasFormChange({ ...props.aliasForm, target_id: value })}
                      options={aliasTargetOptions(props.familyDetail, props.aliasForm.target)}
                    />
                  </div>
                  <button type="submit" className="secondary-button" disabled={props.savingAlias}>
                    {props.savingAlias ? "Сохраняю..." : "Добавить алиас"}
                  </button>
                </form>
              </div>
            </div>

            <div className="subpanel p-3.5">
              <div className="mb-3 text-xs uppercase tracking-[0.16em] text-slate-500">SKU</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                      <th className="pb-3 font-medium">Позиция</th>
                      <th className="pb-3 font-medium">Бренд</th>
                      <th className="pb-3 font-medium">Артикул</th>
                      <th className="pb-3 font-medium">Параметры</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.familyDetail.skus.map((sku) => (
                      <tr key={sku.id} className="border-b border-slate-100 align-top">
                        <td className="py-3 pr-4 text-slate-900">{sku.title}</td>
                        <td className="py-3 pr-4 text-slate-600">{sku.brand ?? "—"}</td>
                        <td className="py-3 pr-4 text-slate-600">{sku.supplier_article ?? "—"}</td>
                        <td className="py-3 text-slate-600">{formatSkuDimensions(sku)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!props.familyDetail.skus.length ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  SKU пока не заведены.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {!props.familyDetailLoading && !props.familyDetail ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            Выберите семейство слева, чтобы открыть детали.
          </div>
        ) : null}
      </section>

      <section className="glass-panel p-4">
        <div className="eyebrow">Добавить SKU</div>
        <h3 className="section-title mt-1.5">Новая закупаемая позиция</h3>
        <form className="mt-3 space-y-3" onSubmit={(event) => void props.onCreateSku(event)}>
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
                ...(props.familyDetail?.variants ?? []).map((variant) => ({
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

          <button type="submit" className="action-button" disabled={props.savingSku}>
            {props.savingSku ? "Сохраняю..." : "Добавить SKU"}
          </button>
        </form>
      </section>
    </div>
  );
}
