import type { FormEvent } from "react";
import type { FamilyFormState, MaterialFamily, MaterialSearchResult } from "./app-types";
import { dialogFieldOptions } from "./app-types";
import { Field } from "./app-ui";
import { searchTypeLabel } from "./app-utils";

type MaterialsCatalogPanelProps = {
  families: MaterialFamily[];
  selectedFamilyId: number | null;
  loading: boolean;
  error: string | null;
  familyForm: FamilyFormState;
  searchResults: MaterialSearchResult[];
  catalogQuery: string;
  savingFamily: boolean;
  onSelectFamily: (familyId: number) => void;
  onFamilyFormChange: (value: FamilyFormState) => void;
  onToggleDialogField: (code: string) => void;
  onCreateFamily: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onReloadFamilies: () => Promise<void>;
  onSearchCatalog: (query: string) => Promise<void>;
};

// Левая панель материалов: поиск, список семейств и создание нового семейства.
export function MaterialsCatalogPanel(props: MaterialsCatalogPanelProps) {
  return (
    <div className="space-y-4">
      <section className="glass-panel p-4">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Каталог</div>
            <h3 className="section-title mt-1.5">Семейства материалов</h3>
          </div>
          <button type="button" className="secondary-button" onClick={() => void props.onReloadFamilies()}>
            Обновить
          </button>
        </div>

        {props.error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {props.error}
          </div>
        ) : null}

        <div className="mb-3 space-y-3">
          <Field
            label="Быстрый поиск по каталогу"
            value={props.catalogQuery}
            onChange={(value) => void props.onSearchCatalog(value)}
            placeholder="Ищите семейство, вариант, SKU или алиас"
          />
          {props.searchResults.length ? (
            <div className="subpanel p-2">
              <div className="mb-2 px-2 text-xs uppercase tracking-[0.16em] text-slate-500">Результаты поиска</div>
              <div className="space-y-2">
                {props.searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    className="search-result"
                    onClick={() => {
                      if (result.family_id) {
                        props.onSelectFamily(result.family_id);
                      }
                    }}
                  >
                    <span className="font-medium text-slate-900">{result.title}</span>
                    <span className="search-result-meta">{searchTypeLabel(result.type)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_60px_60px_64px] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <div>Семейство</div>
          <div className="text-right">Вар.</div>
          <div className="text-right">SKU</div>
          <div className="text-right">Алиасы</div>
        </div>

        <div className="space-y-2">
          {props.families.map((family) => {
            const active = props.selectedFamilyId === family.id;
            return (
              <button
                key={family.id}
                type="button"
                className={active ? "dense-row dense-row-active" : "dense-row"}
                onClick={() => props.onSelectFamily(family.id)}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_60px_60px_64px] items-start gap-2">
                  <div className="min-w-0 text-left">
                    <div className="truncate text-sm font-semibold text-slate-900">{family.canonical_name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-slate-600">
                      {family.category ?? "Без категории"} · ед. {family.default_unit}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-slate-200">{family.variants_count}</div>
                  <div className="text-right text-sm font-semibold text-slate-200">{family.skus_count}</div>
                  <div className="flex justify-end">
                    <span className="stat-chip">{family.aliases_count}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {!props.families.length && !props.loading ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
              Семейств пока нет.
            </div>
          ) : null}
        </div>
      </section>

      <section className="glass-panel p-4">
        <div className="eyebrow">Создать семейство</div>
        <h3 className="section-title mt-1.5">Новая основа каталога</h3>
        <form className="mt-3 space-y-3" onSubmit={(event) => void props.onCreateFamily(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Название"
              value={props.familyForm.canonical_name}
              onChange={(value) => props.onFamilyFormChange({ ...props.familyForm, canonical_name: value })}
              placeholder="Например: Гипсокартон"
            />
            <Field
              label="Единица"
              value={props.familyForm.default_unit}
              onChange={(value) => props.onFamilyFormChange({ ...props.familyForm, default_unit: value })}
              placeholder="шт / лист / мешок"
            />
          </div>
          <Field
            label="Категория"
            value={props.familyForm.category}
            onChange={(value) => props.onFamilyFormChange({ ...props.familyForm, category: value })}
            placeholder="sheet_material / крепеж / смесь"
          />

          <div>
            <div className="field-label">Какие поля бот должен уточнять</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {dialogFieldOptions.map((option) => {
                const active = props.familyForm.dialog_fields.includes(option.code);
                return (
                  <button
                    key={option.code}
                    type="button"
                    className={active ? "chip chip-active" : "chip"}
                    onClick={() => props.onToggleDialogField(option.code)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="action-button" disabled={props.savingFamily}>
            {props.savingFamily ? "Сохраняю..." : "Создать семейство"}
          </button>
        </form>
      </section>
    </div>
  );
}
