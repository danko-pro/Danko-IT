import type { FormEvent } from "react";
import type { AliasFormState, FamilyDetail } from "../../shared/types";
import { Button } from "../../shared/controls";
import { Field, SelectField } from "../../shared/ui";
import { aliasTargetOptions } from "../../shared/utils";

type MaterialsDetailAliasesSectionProps = {
  familyDetail: FamilyDetail;
  aliasForm: AliasFormState;
  savingAlias: boolean;
  onAliasFormChange: (value: AliasFormState) => void;
  onCreateAlias: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function MaterialsDetailAliasesSection(props: MaterialsDetailAliasesSectionProps) {
  return (
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
                target_id: value === "family" ? String(props.familyDetail.family.id) : "",
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

        <Button type="submit" variant="secondary" disabled={props.savingAlias}>
          {props.savingAlias ? "Сохраняю..." : "Добавить алиас"}
        </Button>
      </form>
    </div>
  );
}
