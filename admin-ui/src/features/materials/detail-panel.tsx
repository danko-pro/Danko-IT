import type { FormEvent } from "react";
import type { AliasFormState, FamilyDetail, SkuFormState, VariantFormState } from "../../shared/types";
import { Field, InfoCard, SelectField } from "../../shared/ui";
import { aliasTargetOptions, formatSkuDimensions } from "../../shared/utils";

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
            <div className="subpanel p-4">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Варианты</div>
                  <h3 className="section-title mt-1.5">Линейка внутри семейства</h3>
                </div>
                <span className="slot-chip">{props.familyDetail.variants.length}</span>
              </div>

              <div className="space-y-2">
                {props.familyDetail.variants.map((variant) => (
                  <div key={variant.id} className="dense-row">
                    <div className="text-sm font-medium text-slate-900">{variant.display_name}</div>
                    <div className="mt-2 row-kicker">{variant.code}</div>
                  </div>
                ))}

                {!props.familyDetail.variants.length ? <div className="empty-state">Вариантов пока нет.</div> : null}
              </div>

              <form className="mt-4 space-y-3 border-t border-white/6 pt-4" onSubmit={(event) => void props.onCreateVariant(event)}>
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

            <div className="subpanel p-4">
              <div className="panel-header">
                <div>
                  <div className="eyebrow">Алиасы</div>
                  <h3 className="section-title mt-1.5">Поисковые привязки</h3>
                </div>
                <span className="slot-chip">{props.familyDetail.aliases.length}</span>
              </div>

              <div className="space-y-2">
                {props.familyDetail.aliases.slice(0, 8).map((alias) => (
                  <div key={alias.id} className="dense-row">
                    <div className="text-sm font-medium text-slate-900">{alias.alias}</div>
                    <div className="mt-2 row-kicker">
                      {alias.variant_id ? "Привязан к варианту" : alias.sku_id ? "Привязан к SKU" : "Привязан к семейству"}
                    </div>
                  </div>
                ))}

                {!props.familyDetail.aliases.length ? <div className="empty-state">Алиасов пока нет.</div> : null}
              </div>

              <form className="mt-4 space-y-3 border-t border-white/6 pt-4" onSubmit={(event) => void props.onCreateAlias(event)}>
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
                      { value: "sku", label: "? SKU" },
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

          <div className="subpanel p-4">
            <div className="panel-header">
              <div>
                <div className="eyebrow">SKU</div>
                <h3 className="section-title mt-1.5">Закупаемые позиции</h3>
              </div>
              <span className="slot-chip">{props.familyDetail.skus.length}</span>
            </div>

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

            {!props.familyDetail.skus.length ? <div className="mt-3 empty-state">SKU пока не заведены.</div> : null}
          </div>
        </div>
      </section>

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

