import type { FormEvent } from "react";
import type { FamilyDetail, VariantFormState } from "../../shared/types";
import { Button } from "../../shared/controls";
import { Field } from "../../shared/ui";

type MaterialsDetailVariantsSectionProps = {
  variants: FamilyDetail["variants"];
  variantForm: VariantFormState;
  savingVariant: boolean;
  onVariantFormChange: (value: VariantFormState) => void;
  onCreateVariant: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function MaterialsDetailVariantsSection(props: MaterialsDetailVariantsSectionProps) {
  return (
    <div className="subpanel p-4">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Варианты</div>
          <h3 className="section-title mt-1.5">Линейка внутри семейства</h3>
        </div>
        <span className="slot-chip">{props.variants.length}</span>
      </div>

      <div className="space-y-2">
        {props.variants.map((variant) => (
          <div key={variant.id} className="dense-row">
            <div className="text-sm font-medium text-slate-900">{variant.display_name}</div>
            <div className="mt-2 row-kicker">{variant.code}</div>
          </div>
        ))}

        {!props.variants.length ? <div className="empty-state">Вариантов пока нет.</div> : null}
      </div>

      <form className="mt-4 space-y-3 border-t border-white/6 pt-4" onSubmit={(event) => void props.onCreateVariant(event)}>
        <Field
          label="Новый вариант"
          value={props.variantForm.display_name}
          onChange={(value) => props.onVariantFormChange({ display_name: value })}
          placeholder="Например: влагостойкий"
        />
        <Button type="submit" variant="secondary" disabled={props.savingVariant}>
          {props.savingVariant ? "Сохраняю..." : "Добавить вариант"}
        </Button>
      </form>
    </div>
  );
}
